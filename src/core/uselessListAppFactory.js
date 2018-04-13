import createUnistoreAdapter from './createUnistoreAdapter';
import createRxAdapter from './createRxAdapter';
import createApolloLinkStateAdapter from './createApolloLinkStateAdapter';

const uselessListAppFactory = {
  UNISTORE: createUnistoreAdapter,
  RX: createRxAdapter,
  APOLLO_LINK_STATE: createApolloLinkStateAdapter,
};

export default uselessListAppFactory;
