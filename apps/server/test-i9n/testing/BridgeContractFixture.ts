import { BigNumberish, constants, Signer } from 'ethers';
import {
  BridgeProxy,
  BridgeProxy__factory,
  BridgeV1,
  BridgeV1__factory,
  EvmContractManager,
  HardhatNetwork,
  TestToken,
  TestToken__factory,
} from 'smartcontracts';
import { getCurrentTimeStamp } from 'smartcontracts/src/tests/testUtils/mathUtils';

export class BridgeContractFixture {
  private contractManager: EvmContractManager;

  // The default signer used to deploy contracts
  public adminAndOperationalSigner: Signer;

  constructor(private readonly hardhatNetwork: HardhatNetwork) {
    this.contractManager = hardhatNetwork.contracts;
    this.adminAndOperationalSigner = hardhatNetwork.contractSigner;
  }

  static readonly Contracts = {
    BridgeImplementation: { deploymentName: 'BridgeV1', contractName: 'BridgeV1' },
    BridgeProxy: { deploymentName: 'BridgeProxy', contractName: 'BridgeProxy' },
    MockUSDT: { deploymentName: 'MockUSDT', contractName: 'TestToken' },
    MockUSDC: { deploymentName: 'MockUSDC', contractName: 'TestToken' },
  };

  get contracts(): BridgeContracts {
    const bridgeProxyContract = this.hardhatNetwork.contracts.getDeployedContract<BridgeProxy>(
      BridgeContractFixture.Contracts.BridgeProxy.deploymentName,
    );
    return {
      // Proxy contract proxies all calls to the implementation contract
      bridgeProxy: BridgeV1__factory.connect(bridgeProxyContract.address, this.adminAndOperationalSigner),
      bridgeImplementation: this.hardhatNetwork.contracts.getDeployedContract<BridgeV1>(
        BridgeContractFixture.Contracts.BridgeImplementation.deploymentName,
      ),
      musdt: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        BridgeContractFixture.Contracts.MockUSDT.deploymentName,
      ),
      musdc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        BridgeContractFixture.Contracts.MockUSDC.deploymentName,
      ),
    };
  }

  getContractsWithSigner(userSigner: Signer): BridgeContracts {
    const bridgeProxyContract = this.hardhatNetwork.contracts.getDeployedContract<BridgeProxy>(
      BridgeContractFixture.Contracts.BridgeProxy.deploymentName,
    );
    return {
      // Proxy contract proxies all calls to the implementation contract
      bridgeProxy: BridgeV1__factory.connect(bridgeProxyContract.address, userSigner),
      bridgeImplementation: this.hardhatNetwork.contracts.getDeployedContract<BridgeV1>(
        BridgeContractFixture.Contracts.BridgeImplementation.deploymentName,
        userSigner,
      ),
      musdt: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        BridgeContractFixture.Contracts.MockUSDT.deploymentName,
        userSigner,
      ),
      musdc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        BridgeContractFixture.Contracts.MockUSDC.deploymentName,
        userSigner,
      ),
    };
  }

  get contractsWithAdminAndOperationalSigner(): BridgeContracts {
    return this.getContractsWithSigner(this.adminAndOperationalSigner);
  }

  /**
   * Deploys the contracts, using the Signer of the HardhatContainer as the operational and admin address
   */
  async deployContracts(): Promise<BridgeContracts> {
    // Deploying BridgeV1 implementation contract
    const bridgeUpgradeable = await this.contractManager.deployContract<BridgeV1>({
      deploymentName: BridgeContractFixture.Contracts.BridgeImplementation.deploymentName,
      contractName: BridgeContractFixture.Contracts.BridgeImplementation.contractName,
      abi: BridgeV1__factory.abi,
    });
    await this.hardhatNetwork.generate(1);

    // Deployment arguments for the Proxy contract
    const encodedData = BridgeV1__factory.createInterface().encodeFunctionData('initialize', [
      'CAKE_BRIDGE',
      '0.1',
      // admin address
      await this.adminAndOperationalSigner.getAddress(),
      // operational address
      await this.adminAndOperationalSigner.getAddress(),
      // relayer address
      // TODO: change this to the actual relayer address
      await this.adminAndOperationalSigner.getAddress(),
      // 0.3% txn fee
      30,
    ]);

    // Deploying proxy contract
    const bridgeProxy = await this.contractManager.deployContract<BridgeProxy>({
      deploymentName: BridgeContractFixture.Contracts.BridgeProxy.deploymentName,
      contractName: BridgeContractFixture.Contracts.BridgeProxy.contractName,
      deployArgs: [bridgeUpgradeable.address, encodedData],
      abi: BridgeProxy__factory.abi,
    });
    await this.hardhatNetwork.generate(1);

    // Deploy MockUSDT
    const musdt = await this.contractManager.deployContract<TestToken>({
      deploymentName: BridgeContractFixture.Contracts.MockUSDT.deploymentName,
      contractName: BridgeContractFixture.Contracts.MockUSDT.contractName,
      deployArgs: ['MockUSDT', 'MUSDT'],
      abi: TestToken__factory.abi,
    });

    // Deploy MockUSDC
    const musdc = await this.contractManager.deployContract<TestToken>({
      deploymentName: BridgeContractFixture.Contracts.MockUSDC.deploymentName,
      contractName: BridgeContractFixture.Contracts.MockUSDC.contractName,
      deployArgs: ['MockUSDC', 'MUSDC'],
      abi: TestToken__factory.abi,
    });

    await this.hardhatNetwork.generate(1);

    // Create a reference to the implementation contract via proxy
    const bridge = BridgeV1__factory.connect(bridgeProxy.address, this.adminAndOperationalSigner);

    // Adding MUSDT and MUSDC as supported tokens
    await bridge.addSupportedTokens(musdt.address, constants.MaxInt256, getCurrentTimeStamp());
    await bridge.addSupportedTokens(musdc.address, constants.MaxInt256, getCurrentTimeStamp());

    await this.hardhatNetwork.generate(1);

    return this.contracts;
  }

  /**
   * Mints MUSDC and MUSDT tokens to an EOA
   */
  async mintTokensToEOA(address: string, amount: BigNumberish = constants.MaxInt256): Promise<void> {
    const { musdc, musdt } = this.getContractsWithSigner(this.adminAndOperationalSigner);
    await musdc.mint(address, amount);
    await musdt.mint(address, amount);

    await this.hardhatNetwork.generate(1);
  }

  /**
   * Approves the bridge contract to spend MUSDC and MUSDT tokens.
   *
   * This approves the maximum possible amount.
   * @param signer
   */
  async approveBridgeForEOA(signer: Signer): Promise<void> {
    const { musdc, musdt } = this.getContractsWithSigner(signer);
    const { bridgeProxy } = this.contracts;

    await musdc.approve(bridgeProxy.address, constants.MaxInt256);
    await musdt.approve(bridgeProxy.address, constants.MaxInt256);

    await this.hardhatNetwork.generate(1);
  }

  /**
   * A convenience function that
   * - Deploys the bridge contracts, with MUSDCT and MUSDT as supported tokens
   * - Mints MUSDC and MUSDT tokens to the admin and operational signer of the bridge
   * - Approves the bridge contract to spend MUSDC and MUSDT tokens on behalf of the above signer
   *
   * When using this function, the signer of the HardhatContainer will be the admin and operational signer of the bridge.
   */
  async setup(): Promise<void> {
    await this.deployContracts();
    await this.mintTokensToEOA(await this.adminAndOperationalSigner.getAddress());
    await this.approveBridgeForEOA(await this.adminAndOperationalSigner);
  }
}

export interface BridgeContracts {
  bridgeProxy: BridgeV1;
  bridgeImplementation: BridgeV1;
  musdt: TestToken;
  musdc: TestToken;
}