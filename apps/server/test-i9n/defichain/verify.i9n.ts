import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@birthdayresearch/sticky-testcontainers';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';

import { CustomErrorCodes } from '../../src/CustomErrorCodes';
import { WhaleWalletProvider } from '../../src/defichain/providers/WhaleWalletProvider';
import { PrismaService } from '../../src/PrismaService';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';
import { DeFiChainStubContainer, StartedDeFiChainStubContainer } from './containers/DeFiChainStubContainer';

// TODO: Find a nestjs way of configuring throttle limit for tests
jest.mock('../../src/ThrottleLimitConfig', () => ({
  ThrottleLimitConfig: {
    limit: 20,
    ttl: 30,
  },
}));

describe('DeFiChain Verify fund Testing', () => {
  let testing: BridgeServerTestingApp;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let defichain: StartedDeFiChainStubContainer;
  let prismaService: PrismaService;

  // Tests are slower because it's running 3 containers at the same time
  jest.setTimeout(3600000);
  let whaleWalletProvider: WhaleWalletProvider;
  let localAddress: string;
  let wallet: WhaleWalletAccount;
  const WALLET_ENDPOINT = `/defichain/wallet/`;
  const VERIFY_ENDPOINT = `${WALLET_ENDPOINT}verify`;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();
    defichain = await new DeFiChainStubContainer().start();
    const whaleURL = await defichain.getWhaleURL();
    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: { whaleURL, key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
          startedPostgresContainer,
        }),
      ),
    );

    const app = await testing.start();

    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);

    whaleWalletProvider = app.get<WhaleWalletProvider>(WhaleWalletProvider);
    wallet = whaleWalletProvider.createWallet(2);
    localAddress = await wallet.getAddress();
  });

  afterAll(async () => {
    // teardown database
    await prismaService.deFiChainAddressIndex.deleteMany({});
    await startedPostgresContainer.stop();
    await testing.stop();
    await defichain.stop();
  });

  type MockedPayload = {
    amount: string;
    symbol: string;
    address: string;
  };

  async function verify(mockedPayload: MockedPayload) {
    const initialResponse = await testing.inject({
      method: 'POST',
      url: `${VERIFY_ENDPOINT}`,
      payload: mockedPayload,
    });
    const response = JSON.parse(initialResponse.body);

    return response;
  }

  it('should throw error if symbol is not valid', async () => {
    const response = await verify({
      amount: '1',
      symbol: '_invalid_symbol_',
      address: localAddress,
    });

    expect(response).toStrictEqual({
      error: 'Bad Request',
      message: ['symbol must be one of the following values: BTC, USDT, USDC, ETH'],
      statusCode: 400,
    });
  });

  it('should throw error if address is invalid', async () => {
    const response = await verify({
      amount: '1',
      symbol: 'BTC',
      address: '_invalid_address_',
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AddressNotValid });
  });

  it('should throw error if address has zero balance', async () => {
    // Generate address (index = 2)
    await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate`,
      query: {
        refundAddress: localAddress,
      },
    });

    const response = await verify({
      amount: '3',
      symbol: 'BTC',
      address: localAddress,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.IsZeroBalance });
  });

  it('should throw error if address is not found in db', async () => {
    // Get address (not generated through API)
    const newWallet = whaleWalletProvider.createWallet(3);
    const newLocalAddress = await newWallet.getAddress();

    const response = await verify({
      amount: '2',
      symbol: 'BTC',
      address: newLocalAddress,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AddressNotFound });
  });

  it('should throw error if balance did not match with the amount', async () => {
    // Generate address (index = 3)
    await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate`,
      query: {
        refundAddress: localAddress,
      },
    });

    const newWallet = whaleWalletProvider.createWallet(3);
    const newLocalAddress = await newWallet.getAddress();

    // Sends token to the address
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [newLocalAddress]: `3@BTC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    const response = await verify({
      amount: '10',
      symbol: 'BTC',
      address: newLocalAddress,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.BalanceNotMatched });
  });

  it('should throw error if address is not owned by the wallet', async () => {
    const randomAddress = 'bcrt1qg8m5rcgc9da0dk2dmj9zltvlc99s5qugs4nf2l';
    // Update with a random valid address (not owned by the wallet)
    const data = {
      address: randomAddress,
    };
    await prismaService.deFiChainAddressIndex.update({ where: { index: 3 }, data });

    const response = await verify({
      amount: '3',
      symbol: 'BTC',
      address: randomAddress,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AddressNotOwned });
  });

  it('should throw error if amount is invalid', async () => {
    const response = await verify({
      amount: '-3',
      symbol: 'BTC',
      address: localAddress,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AmountNotValid });
  });

  // TODO: Return the signed claim
  it('should verify fund in the wallet address', async () => {
    // Sends token to the address
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [localAddress]: `10@BTC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    const response = await verify({
      amount: '10',
      symbol: 'BTC',
      address: localAddress,
    });

    expect(response).toStrictEqual({ isValid: true });
  });
});