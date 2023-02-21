import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployContracts } from './testUtils/deployment';

describe('BridgeV1 deployment test', () => {
  it('BridgeV1 should be deployed with correct Admin, Operational and relayer addresses', async () => {
    const { proxyBridge, defaultAdminSigner, operationalAdminSigner, communityAddress } = await loadFixture(
      deployContracts,
    );
    // Check if the accounts[0] has the admin role.
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    expect(await proxyBridge.hasRole(DEFAULT_ADMIN_ROLE, defaultAdminSigner.address)).to.equal(true);
    // Check if the relayer address is same as accounts[0]
    expect(defaultAdminSigner.address).to.be.equal(await proxyBridge.relayerAddress());
    // Check if the accounts[1] has the OPERATIONAL_ROLE.
    const OPERATIONAL_ROLE = ethers.utils.solidityKeccak256(['string'], ['OPERATIONAL_ROLE']);
    expect(await proxyBridge.hasRole(OPERATIONAL_ROLE, operationalAdminSigner.address)).to.equal(true);
    expect(await proxyBridge.communityWallet()).to.equal(communityAddress);
    // checking Contract version, should be 1
    expect(await proxyBridge.version()).to.be.equal('1');
  });
  it('Successfully fetching constants', async () => {
    const { proxyBridge } = await loadFixture(deployContracts);
    expect(await proxyBridge.name()).to.be.equal('QUANTUM_BRIDGE');
  });
});
