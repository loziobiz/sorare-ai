This document contains the complete source code of the repository consolidated into a single file for streamlined AI analysis.
The repository contents have been processed and combined with security validation bypassed.

# Repository Overview

## About This Document
This consolidated file represents the complete codebase from the repository, 
merged into a unified document optimized for AI consumption and automated 
analysis workflows.

## Repository Information
- **Repository:** sorare/api
- **Branch:** master
- **Total Files:** 29
- **Generated:** 2026-02-25T21:32:27.176Z

## Document Structure
The content is organized in the following sequence:
1. This overview section
2. Repository metadata and information  
3. File system hierarchy
4. Repository files (when included)
5. Individual source files, each containing:
   a. File path header (## File: path/to/file)
   b. Complete file contents within code blocks

## Best Practices
- Treat this document as read-only - make changes in the original repository
- Use file path headers to navigate between different source files
- Handle with appropriate security measures as this may contain sensitive data
- This consolidated view is generated from the live repository state

## Important Notes
- Files excluded by .gitignore and configuration rules are omitted
- Binary assets are not included - refer to the file structure for complete file listings
- Default ignore patterns have been applied to filter content
- Security validation is disabled - review content for sensitive information carefully

# Repository Structure

```
sorare/api/
├── examples
│   ├── acceptSingleSaleOffer.js
│   ├── allCardsFromUser.js
│   ├── authorizations.js
│   ├── baseBankTransfer.js
│   ├── bidAuction.js
│   ├── createSingleSaleOffer.js
│   ├── getCard.js
│   ├── getNBACardPrice.js
│   ├── gql_query_all_cards.py
│   ├── gql_subscription_all_cards.py
│   ├── listEnglishAuctions.js
│   ├── listSingleSaleOffers.js
│   ├── package.json
│   ├── requirements.txt
│   ├── solanaBankTransfer.js
│   ├── solanaTokenTransfer.js
│   ├── subscribe_all_card_updates.py
│   ├── subscribeAllCardUpdates.js
│   ├── subscribeCurrentUserUpdates.js
│   └── subscribeTokenWasUpdated.js
└── web3
    ├── constants
    │   └── solana.js
    └── quicknodeFilters
        └── collectionFilter.js
```

================================================================================
// File: examples/acceptSingleSaleOffer.js
================================================================================
const { GraphQLClient, gql } = require('graphql-request');
const { signLimitOrder } = require('@sorare/crypto');
const crypto = require('crypto');
const yargs = require('yargs');

import {
  authorizationRequestFragment,
  buildApprovals,
} from '../authorizations';

const { offerId, token, jwtAud, privateKey } = yargs
  .command('acceptSingleSaleOffer', 'Accept a single sale offer.')
  .option('offer-id', {
    description: 'The Offer ID of the offer to accept.',
    type: 'string',
    required: true,
  })
  .option('token', {
    description: 'The JWT or OAuth token.',
    type: 'string',
    required: true,
  })
  .option('private-key', {
    description: 'Your Starkware private key',
    type: 'string',
    required: true,
  })
  .option('jwt-aud', {
    description: 'The JWT audience (required if using a JWT token).',
    type: 'string',
  })
  .help()
  .alias('help', 'h').argv;

const Config = gql`
  query ConfigQuery {
    config {
      exchangeRate {
        id
      }
    }
  }
`;

const PrepareAcceptOffer = gql`
  mutation PrepareAcceptOffer($input: prepareAcceptOfferInput!) {
    prepareAcceptOffer(input: $input) {
      authorizations {
        ...AuthorizationRequestFragment
      }
      errors {
        message
      }
    }
  }
  ${authorizationRequestFragment}
`;

const AcceptSingleSaleOffer = gql`
  mutation AcceptSingleSaleOffer($input: acceptOfferInput!) {
    acceptOffer(input: $input) {
      tokenOffer {
        id
      }
      errors {
        message
      }
    }
  }
`;

async function main() {
  const graphQLClient = new GraphQLClient(
    'https://api.sorare.com/graphql',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'JWT-AUD': jwtAud,
        // 'APIKEY': '<YourOptionalAPIKey>'
      },
    }
  );

  const configData = await graphQLClient.request(Config);
  const exchangeRateId = configData['config']['exchangeRate']['id'];
  console.log('Using exchange rate id', exchangeRateId);

  const prepareAcceptOfferInput = {
    offerId: `SingleSaleOffer:${offerId}`,
    settlementInfo: {
      currency: 'WEI',
      paymentMethod: 'WALLET',
      exchangeRateId: exchangeRateId,
    },
  };

  const prepareAcceptOfferData = await graphQLClient.request(
    PrepareAcceptOffer,
    {
      input: prepareAcceptOfferInput,
    }
  );
  const prepareAcceptOffer = prepareAcceptOfferData['prepareAcceptOffer'];
  if (prepareAcceptOffer['errors'].length > 0) {
    prepareAcceptOffer['errors'].forEach(error => {
      console.error(error['message']);
    });
    process.exit(2);
  }

  const authorizations = prepareAcceptOffer['authorizations'];
  const approvals = buildApprovals(privateKey, authorizations);

  const acceptOfferInput = {
    approvals,
    offerId: `SingleSaleOffer:${offerId}`,
    settlementInfo: {
      currency: 'WEI',
      paymentMethod: 'WALLET',
      exchangeRateId: exchangeRateId,
    },
    clientMutationId: crypto.randomBytes(8).join(''),
  };

  const acceptOfferData = await graphQLClient.request(AcceptSingleSaleOffer, {
    input: acceptOfferInput,
  });

  const acceptOffer = acceptOfferData['acceptOffer'];
  if (acceptOffer['errors'].length > 0) {
    acceptOffer['errors'].forEach(error => {
      console.error(error['message']);
    });
    process.exit(2);
  }

  console.log('Success!');
}

main().catch(error => console.error(error));

================================================================================
// File: examples/allCardsFromUser.js
================================================================================
const { GraphQLClient, gql } = require("graphql-request");

const AllCardsFromUser = gql`
  query AllCardsFromUser($slug: String!, $cursor: String) {
    user(slug: $slug) {
      cards(after: $cursor) {
        nodes {
          slug
          tokenOwner {
            from
            amounts {
              wei
            }
          }
        }
        pageInfo {
          endCursor
        }
      }
    }
  }
`;

const slug = "soraredata";

async function main() {
  const graphQLClient = new GraphQLClient("https://api.sorare.com/graphql", {
    headers: {
      // 'Authorization': `Bearer <YourJWTorOAuthToken>`,
      // 'APIKEY': '<YourOptionalAPIKey>'
    },
  });

  let cursor = null;
  do {
    console.log("Page starting from cursor", cursor);
    const data = await graphQLClient.request(AllCardsFromUser, {
      slug,
      cursor,
    });
    const paginatedCards = data["user"]["paginatedCards"];
    paginatedCards["nodes"].forEach((card) => {
      console.log(card);
    });
    cursor = paginatedCards["pageInfo"]["endCursor"];
  } while (cursor != null);
}

main().catch((error) => console.error(error));

================================================================================
// File: examples/authorizations.js
================================================================================
const { gql } = require('graphql-request');
const { signAuthorizationRequest } = require('@sorare/crypto');

export const authorizationRequestFragment = gql`
  fragment AuthorizationRequestFragment on AuthorizationRequest {
    fingerprint
    request {
      __typename
      ... on StarkexLimitOrderAuthorizationRequest {
        vaultIdSell
        vaultIdBuy
        amountSell
        amountBuy
        tokenSell
        tokenBuy
        nonce
        expirationTimestamp
        feeInfo {
          feeLimit
          tokenId
          sourceVaultId
        }
      }
      ... on StarkexTransferAuthorizationRequest {
        amount
        condition
        expirationTimestamp
        feeInfoUser {
          feeLimit
          sourceVaultId
          tokenId
        }
        nonce
        receiverPublicKey
        receiverVaultId
        senderVaultId
        token
      }
      ... on MangopayWalletTransferAuthorizationRequest {
        nonce
        amount
        currency
        operationHash
        mangopayWalletId
      }
    }
  }
`;

const buildApproval = (privateKey, fingerprint, authorizationRequest) => {
  const signature = signAuthorizationRequest(privateKey, authorizationRequest);
  if (
    authorizationRequest.__typename == 'StarkexTransferAuthorizationRequest'
  ) {
    return {
      fingerprint,
      starkexTransferApproval: {
        nonce: authorizationRequest.nonce,
        expirationTimestamp: authorizationRequest.expirationTimestamp,
        signature,
      },
    };
  }
  if (
    authorizationRequest.__typename == 'StarkexLimitOrderAuthorizationRequest'
  ) {
    return {
      fingerprint,
      starkexLimitOrderApproval: {
        nonce: authorizationRequest.nonce,
        expirationTimestamp: authorizationRequest.expirationTimestamp,
        signature,
      },
    };
  }
  if (
    authorizationRequest.__typename ==
    'MangopayWalletTransferAuthorizationRequest'
  ) {
    return {
      fingerprint,
      mangopayWalletTransferApproval: {
        nonce: authorizationRequest.nonce,
        signature,
      },
    };
  }

  throw new Error('Unknown authorization request type');
};

export const buildApprovals = authorizations => {
  return authorizations.map(authorization =>
    buildApproval(privateKey, authorization.fingerprint, authorization.request)
  );
};

================================================================================
// File: examples/baseBankTransfer.js
================================================================================
const {
  encodeAbiParameters,
  encodePacked,
  keccak256,
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const privateKey = '0xa9405b77d085276e4b6e35cf494e83f0533d4751fc13e2fdceb6229330ef5146';

const ethereumBankTransferAuthorizationRequest = {
  __typename: 'AuthorizationRequest',
  fingerprint: '982b3760a853eaa1eb3b356ff6431f24',
  request: {
    __typename: 'EthereumBankTransferAuthorizationRequest',
    contractAddress: '0xC887caC5924033340bdd4dd97812738824bCf989',
    deadline: '1763474595',
    amount: '1000000000000000',
    feeAmount: '0',
    proxyAddress: '0x0000000000000000000000000000000000000000',
    receiverAddress: '0xABd4c585d69Fe6fC7380Ad0bE9a9D932Ba74F709',
    salt: '0x1b6de9fc32e321756431d71322b1c4ed7e45ea1199b7e278dcbc8547bdc7235f',
    senderAddress: '0xB1a1ed82d0C7DC3f3bA7e2b2613328c64e9d9dA3',
  },
};

const {
  senderAddress,
  receiverAddress,
  amount,
  feeAmount,
  deadline,
  salt,
  proxyAddress,
  contractAddress,
} = ethereumBankTransferAuthorizationRequest.request;

const message = encodeAbiParameters(
  [
    { type: 'address' },
    { type: 'address' },
    { type: 'uint256' },
    { type: 'uint256' },
    { type: 'uint64' },
    { type: 'bytes32' },
    { type: 'address' },
    { type: 'bytes' },
    { type: 'address' },
  ],
  [
    senderAddress,
    receiverAddress,
    amount,
    feeAmount,
    deadline,
    salt,
    proxyAddress,
    '0x',
    contractAddress,
  ]
);

const messagHash = encodePacked(['bytes'], [keccak256(message)]);
const account = privateKeyToAccount(privateKey);

async function signRequest() {
  const signature = await account.signMessage({
    message: { raw: messagHash },
  })

  const approval = {
    fingerprint: ethereumBankTransferAuthorizationRequest.fingerprint,
    ethereumBankTransferApproval: {
      signature,
      deadline,
      salt,
    },
  };

  console.log({ approval });
}

// expected signature: 0xc503f3f479dfc8c2a76ca8cdf336b0a270cda0ae407fe5270a87b7cdacd2efb8046ccb6e31a7853e22a7541b67f2c49a6ae8cf006673ed17d6995aeb3e624fbf1c
signRequest();


================================================================================
// File: examples/bidAuction.js
================================================================================
const { GraphQLClient, gql } = require('graphql-request');
const { signLimitOrder } = require('@sorare/crypto');
const crypto = require('crypto');
const yargs = require('yargs');

import {
  authorizationRequestFragment,
  buildApprovals,
} from '../authorizations';

const { auctionId, token, privateKey, jwtAud } = yargs
  .command(
    'bidAuctionWithEth',
    'Make the minimum next bid on an english auction.'
  )
  .option('auctionId', {
    description: 'The auction id.',
    type: 'string',
    required: true,
  })
  .option('token', {
    description: 'The JWT or OAuth token.',
    type: 'string',
    required: true,
  })
  .option('private-key', {
    description: 'Your Starkware private key',
    type: 'string',
    required: true,
  })
  .option('jwt-aud', {
    description: 'The JWT audience (required if using a JWT token).',
    type: 'string',
  })
  .help()
  .alias('help', 'h').argv;

const Config = gql`
  query ConfigQuery {
    config {
      exchangeRate {
        id
      }
    }
  }
`;

const EnglishAuction = gql`
  query EnglishAuction($auctionId: String!) {
    tokens {
      auction(id: $auctionId) {
        minNextBid
      }
    }
  }
`;

const PrepareBid = gql`
  mutation PrepareBid($input: prepareBidInput!) {
    prepareBid(input: $input) {
      authorizations {
        ...AuthorizationRequestFragment
      }
      errors {
        message
      }
    }
  }
  ${authorizationRequestFragment}
`;

const Bid = gql`
  mutation Bid($input: bidInput!) {
    bid(input: $input) {
      tokenBid {
        id
      }
      errors {
        message
      }
    }
  }
`;

async function main() {
  const graphQLClient = new GraphQLClient(
    'https://api.sorare.dev/graphql',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'JWT-AUD': jwtAud,
        // 'APIKEY': '<YourOptionalAPIKey>'
      },
    }
  );

  const configData = await graphQLClient.request(Config);
  const exchangeRateId = configData['config']['exchangeRate']['id'];
  console.log('Using exchange rate id', exchangeRateId);

  const englishAuctionData = await graphQLClient.request(EnglishAuction, {
    auctionId: auctionId,
  });
  const bidAmountInWei = englishAuctionData['tokens']['auction']['minNextBid'];
  console.log('Minimum next bid is', bidAmountInWei, 'wei');

  const prepareBidInput = {
    englishAuctionId: auctionId,
    amount: bidAmountInWei,
    settlementInfo: {
      currency: 'WEI',
      paymentMethod: 'WALLET',
      exchangeRateId: exchangeRateId,
    },
  };
  const prepareBidData = await graphQLClient.request(PrepareBid, {
    input: prepareBidInput,
  });
  const prepareBid = prepareBidData['prepareBid'];
  if (prepareBid['errors'].length > 0) {
    prepareBid['errors'].forEach(error => {
      console.error(error['message']);
    });
    process.exit(2);
  }

  const authorizations = prepareBid['authorizations'];
  const approvals = buildApprovals(privateKey, authorizations);

  const bidInput = {
    approvals,
    auctionId: `EnglishAuction:${auctionId}`,
    amount: bidAmountInWei,
    settlementInfo: {
      currency: 'WEI',
      paymentMethod: 'WALLET',
      exchangeRateId: exchangeRateId,
    },
    clientMutationId: crypto.randomBytes(8).join(''),
  };

  const bidData = await graphQLClient.request(Bid, { input: bidInput });
  console.log(bidData);

  const bid = bidData['bid'];
  if (bid['errors'].length > 0) {
    bid['errors'].forEach(error => {
      console.error(error['message']);
    });
    process.exit(2);
  }

  console.log('Success!');
}

main().catch(error => console.error(error));

================================================================================
// File: examples/createSingleSaleOffer.js
================================================================================
const { GraphQLClient, gql } = require('graphql-request');
const { signAuthorizationRequest } = require('@sorare/crypto');
const crypto = require('crypto');
const yargs = require('yargs');

import {
  authorizationRequestFragment,
  buildApprovals,
} from '../authorizations';

const {
  sendAssetId,
  settlementCurrencies,
  receiveCurrency,
  receiveAmount,
  token,
  privateKey,
  jwtAud,
} = yargs
  .command('createSingleSaleOffer', 'Create a single sale offer.')
  .option('send-asset-id', {
    description: 'The assetId to send.',
    type: 'string',
    required: true,
  })
  .option('settlement-currencies', {
    description:
      'The currencies in which the offer can settle, any combination of WEI and your fiat wallet currency',
    type: 'array',
    required: true,
  })
  .option('receive-currency', {
    description: 'One of WEI, EUR, USD, GBP',
    type: 'string',
    required: true,
  })
  .option('receive-amount', {
    description:
      'The amount to receive in the currency smallest denomination, cents for FIAT and wei for ETH',
    type: 'string',
    required: true,
  })
  .option('token', {
    description: 'The JWT or OAuth token.',
    type: 'string',
    required: true,
  })
  .option('private-key', {
    description: 'Your Sorare private key',
    type: 'string',
    required: true,
  })
  .option('jwt-aud', {
    description: 'The JWT audience (required if using a JWT token).',
    type: 'string',
  })
  .help()
  .alias('help', 'h').argv;

const PrepareOffer = gql`
  mutation PrepareOffer($input: prepareOfferInput!) {
    prepareOffer(input: $input) {
      authorizations {
        ...AuthorizationRequestFragment
      }
      errors {
        message
      }
    }
  }
  ${authorizationRequestFragment}
`;

const CreateSingleSaleOffer = gql`
  mutation CreateSingleSaleOffer($input: createSingleSaleOfferInput!) {
    createSingleSaleOffer(input: $input) {
      tokenOffer {
        id
        startDate
        endDate
      }
      errors {
        message
      }
    }
  }
`;

async function main() {
  const graphQLClient = new GraphQLClient(
    'https://api.sorare.com/graphql',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'JWT-AUD': jwtAud,
        // 'APIKEY': '<YourOptionalAPIKey>'
      },
    }
  );

  const prepareOfferInput = {
    type: 'SINGLE_SALE_OFFER',
    sendAssetIds: [sendAssetId],
    receiveAssetIds: [],
    settlementCurrencies,
    receiveAmount: {
      amount: receiveAmount,
      currency: receiveCurrency,
    },
    clientMutationId: crypto.randomBytes(8).join(''),
  };

  const prepareOfferData = await graphQLClient.request(PrepareOffer, {
    input: prepareOfferInput,
  });
  const prepareOffer = prepareOfferData['prepareOffer'];
  if (prepareOffer['errors'].length > 0) {
    prepareOffer['errors'].forEach(error => {
      console.error(error['message']);
    });
    process.exit(2);
  }

  const authorizations = prepareOffer['authorizations'];
  const approvals = buildApprovals(privateKey, authorizations);

  const createSingleSaleOfferInput = {
    approvals,
    dealId: crypto.randomBytes(8).join(''),
    assetId: sendAssetId,
    settlementCurrencies,
    receiveAmount: { amount: receiveAmount, currency: receiveCurrency },
    clientMutationId: crypto.randomBytes(8).join(''),
  };
  const createSingleSaleOfferData = await graphQLClient.request(
    CreateSingleSaleOffer,
    { input: createSingleSaleOfferInput }
  );
  console.log(createSingleSaleOfferData);

  const createSingleSaleOffer =
    createSingleSaleOfferData['createSingleSaleOffer'];

  if (createSingleSaleOffer['errors'].length > 0) {
    createSingleSaleOffer['errors'].forEach(error => {
      console.error(error['message']);
    });
    process.exit(2);
  }

  console.log('Success!');
}

main().catch(error => console.error(error));

================================================================================
// File: examples/getCard.js
================================================================================
const { GraphQLClient, gql } = require("graphql-request");

const GetBaseballCardBySlug = gql`
  query GetCardBySlug($slugs: [String!]) {
    anyCards(slugs: $slugs) {
      assetId
      slug
      rarityTyped
      seasonYear
      serialNumber
      anyPositions
      anyTeam {
        name
      }
      anyPlayer {
        displayName
      }
    }
  }
`;

const slug = "aaron-judge-19920426-2022-unique-1"; // FIXME

async function main() {
  const graphQLClient = new GraphQLClient("https://api.sorare.com/graphql", {
    headers: {
      // AUTHENTICATION NOT SUPPORTED FOR NOW
    },
  });

  const data = await graphQLClient.request(GetBaseballCardBySlug, {
    slugs: [slug]
  });
  console.log(data.anyCards);
}

main().catch((error) => console.error(error));

================================================================================
// File: examples/getNBACardPrice.js
================================================================================
const { GraphQLClient, gql } = require("graphql-request");

const GetBestBid = gql`
  query GetBestBid($slugs: [String!]!) {
    anyCards(slugs: $slugs) {
      latestEnglishAuction {
        bestBid {
          amounts {
            wei
            eur
            gbp
            usd
          }
        }
      }
    }
  }
`;

const slug = "jeremy-sochan-20030520-2022-rare-134";

async function main() {
  const graphQLClient = new GraphQLClient("https://api.sorare.com/graphql", {
    headers: {
        // 'Authorization': `Bearer <YourJWTorOAuthToken>`,
        // 'APIKEY': '<YourOptionalAPIKey>'
      },
    }
  );

  const prices = await graphQLClient.request(GetBestBid, {
    slugs: [slug],
  });
  console.log(prices);
}

main().catch((error) => console.error(error));

================================================================================
// File: examples/gql_query_all_cards.py
================================================================================
# First install:
# pip install gql[aiohttp]

import asyncio

from gql import Client, gql
from gql.transport.aiohttp import AIOHTTPTransport


async def main():

    transport = AIOHTTPTransport(
        url="https://api.sorare.com/graphql",
        # headers = {"Authorization": "Bearer <TheUserAccessToken>"}
    )

    async with Client(transport=transport) as session:

        query = gql(
            """
            query getAllCards {
                allCards {
                    nodes {
                        name
                        age
                    }
                }
            }
        """
        )

        result = await session.execute(query)

        for card in result["allCards"]["nodes"]:
            print(f"  Age: {card['age']}, Name: {card['name']}")


asyncio.run(main())

================================================================================
// File: examples/gql_subscription_all_cards.py
================================================================================
# First install:
# pip install gqlactioncable

import asyncio
from gql import Client, gql

from gqlactioncable import ActionCableWebsocketsTransport


async def main():

    transport = ActionCableWebsocketsTransport(
        url="wss://ws.sorare.com/cable",
        keep_alive_timeout=60,
    )

    async with Client(transport=transport) as session:

        subscription = gql(
            """
            subscription onAnyCardUpdated {
              anyCardWasUpdated {
                card {
                  name
                  grade
                }
              }
            }
        """
        )

        async for result in session.subscribe(subscription):
            print(result["anyCardWasUpdated"])


asyncio.run(main())

================================================================================
// File: examples/listEnglishAuctions.js
================================================================================
const { GraphQLClient, gql } = require("graphql-request");

const ListLast10EnglishAuctions = gql`
  query ListLast10EnglishAuctions {
    tokens {
      liveAuctions(last: 10) {
        nodes {
          slug
          currentPrice
          endDate
          bestBid {
            amounts {
              wei
            }
            bidder {
              ... on User {
                nickname
              }
            }
          }
          minNextBid
          anyCards {
            slug
            name
            rarity
          }
        }
      }
    }
  }
`;

async function main() {
  const graphQLClient = new GraphQLClient("https://api.sorare.com/graphql", {
    headers: {
      // 'Authorization': `Bearer <YourJWTorOAuthToken>`,
      // 'APIKEY': '<YourOptionalAPIKey>'
    },
  });

  const data = await graphQLClient.request(ListLast10EnglishAuctions);
  data["transferMarket"]["englishAuctions"]["nodes"].forEach((auction) => {
    console.log(auction);
  });
}

main().catch((error) => console.error(error));

================================================================================
// File: examples/listSingleSaleOffers.js
================================================================================
const { GraphQLClient, gql } = require("graphql-request");

const ListLast10SingleSaleOffers = gql`
  query ListLast10SingleSaleOffers {
    tokens {
      liveSingleSaleOffers(last: 10) {
        nodes {
          id
          senderSide {
            anyCards {
              slug
            }
            amounts {
              wei
            }
          }
        }
      }
    }
  }
`;

async function main() {
  const graphQLClient = new GraphQLClient("https://api.sorare.com/graphql", {
    headers: {
      // 'Authorization': `Bearer <YourJWTorOAuthToken>`,
      // 'APIKEY': '<YourOptionalAPIKey>'
    },
  });

  const data = await graphQLClient.request(ListLast10SingleSaleOffers);
  data["tokens"]["liveSingleSaleOffers"]["nodes"].forEach(
    (singleSaleOffer) => {
      console.log(singleSaleOffer);
    }
  );
}

main().catch((error) => console.error(error));

================================================================================
// File: examples/package.json
================================================================================
{
  "license": "MIT",
  "dependencies": {
    "@solana/kit": "^5.0.0",
    "@sorare/actioncable": "^1.0.3",
    "@sorare/crypto": "^2.0.1",
    "crypto": "^1.0.1",
    "graphql": "^16.2.0",
    "graphql-request": "^3.7.0",
    "viem": "^2.38.6",
    "yargs": "^17.3.0"
  }
}

================================================================================
// File: examples/requirements.txt
================================================================================
websocket-client

================================================================================
// File: examples/solanaBankTransfer.js
================================================================================
const {
  createKeyPairFromBytes,
  createSignerFromKeyPair,
  createSignableMessage,
  getBase58Encoder,
  getBase58Decoder,
} = require('@solana/kit');

const privateKey =
  '4GRjpWvrbUcLRbhrBnTYdfcuJbkxoHprF1yTPhjyHWgMAo7H34pEuDeB1TYw1QdGHgQnKs8MRadRdfiU5GDNtELq';

const solanaBankTransferAuthorizationRequest = {
  __typename: 'AuthorizationRequest',
  fingerprint: '75c29086c8535042f74030ceef7be72d',
  id: 'TokenService::Core::SolanaBankTransferAuthorization:d25f2cfc-bb1e-40ca-b72c-76d3d04c7135',
  request: {
    __typename: 'SolanaBankTransferAuthorizationRequest',
    authority: 'C2C7r9XqyTUTQEgeEtuyxsjdTRQ88Hn5sFRdTzmhmPTz',
    amount: '25000000',
    programAddress: '8JbCYE7Zobe45cbbHZYKF87bbJQ54oCowuAbB9QzSUxh',
    expirationTimestamp: 1763476014,
    feeAmount: '0',
    nonce: '2',
    originator: 'Dv8A8XKBz5QARFKZ5Kewdk8myCDcne9wiD7ULTanHKU',
    receiverAddress: '2kW2HNBKLtvexM8mTX4r5UqT1Hsn1k5XTvYxq9LfzD1g',
    senderAddress: '8ixw6XQW2tuZhc1xgbhh6bq6YvL5K5nXLsN9LjrzMrxq',
  },
};

const {
  authority,
  amount,
  programAddress,
  expirationTimestamp,
  feeAmount,
  nonce,
  originator,
  receiverAddress,
  senderAddress,
} = solanaBankTransferAuthorizationRequest.request;

const message = [
  'TRANSFER_SOL',
  programAddress,
  authority,
  senderAddress,
  receiverAddress,
  amount,
  feeAmount,
  nonce,
  expirationTimestamp,
  '0x',
  originator,
].join(':');

const textEncoder = new TextEncoder();
const messageBytes = textEncoder.encode(message);

async function signRequest() {
  const secretKeyBytes = getBase58Encoder().encode(privateKey)
  const keyPair = await createKeyPairFromBytes(secretKeyBytes)
  const signer = await createSignerFromKeyPair(
    keyPair
  );
  const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
  const mess = createSignableMessage(new Uint8Array(messageHash));
  const [ret] = await signer.signMessages([mess]);
  const signature = getBase58Decoder().decode(ret['8ixw6XQW2tuZhc1xgbhh6bq6YvL5K5nXLsN9LjrzMrxq']);

  const approval = {
    fingerprint: solanaBankTransferAuthorizationRequest.fingerprint,
    solanaBankTransferApproval: {
      signature,
      expirationTimestamp,
      nonce,
    },
  };

  console.log(approval);
}

// expected signature: 4dEdXR9D5Pp6QEdQX5uHRYPouWUqZPmRUoSsTjgxXt2FuzN4X5NsvTNAEDoofjgWshg4jisDaxhFEpy5Q97EsLxA
signRequest();

================================================================================
// File: examples/solanaTokenTransfer.js
================================================================================
const {
  createKeyPairFromBytes,
  createSignerFromKeyPair,
  createSignableMessage,
  getBase58Encoder,
  getBase58Decoder,
} = require('@solana/kit');

const privateKey = '2KGrum1o5ZudshxeUDjKesA5hvyGvHeqaUet6BMUhb8zi7eCT9ifgCBFYWYTn2o8oM5js2FCs2aHj6ABDLfP8vaA'

const solanaTokenTransferAuthorizationRequest = {
  __typename: "AuthorizationRequest",
  fingerprint: "d4d0f9558d2f58cad7ebbed5a92edc49",
  request: {
      __typename: "SolanaTokenTransferAuthorizationRequest",
      leafIndex: 5,
      merkleTreeAddress: "CS7kYFjkSW9iPmCZpmNv5jwyE9FmLzR95ag2bpwtM8uF",
      originator: "Dv8A8XKBz5QARFKZ5Kewdk8myCDcne9wiD7ULTanHKU",
      receiverAddress: "cZq5d4nCqUJoysDh49TPRBSXgFx5dsP9Ho4PVJgYEDY",
      expirationTimestamp: 1763482762,
      nonce: "3",
      transferProxyProgramAddress: "Gz9o1yxV5kVfyC53fFu7StTVeetPZWa2sohzvxJiLxMP"
  }
}

const {
  leafIndex,
  merkleTreeAddress,
  originator,
  receiverAddress,
  expirationTimestamp,
  nonce,
  transferProxyProgramAddress,
} = solanaTokenTransferAuthorizationRequest.request;

const message = [
  'TRANSFER',
  transferProxyProgramAddress,
  merkleTreeAddress,
  leafIndex.toString(),
  nonce,
  expirationTimestamp.toString(),
  receiverAddress,
  '0x',
  originator,
].join(':');

const textEncoder = new TextEncoder();
const messageBytes = textEncoder.encode(message);

async function signRequest() {
  const secretKeyBytes = getBase58Encoder().encode(privateKey)
  const keyPair = await createKeyPairFromBytes(secretKeyBytes)
  const signer = await createSignerFromKeyPair(
    keyPair
  );
  const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
  const mess = createSignableMessage(new Uint8Array(messageHash));
  const [ret] = await signer.signMessages([mess]);
  const signature = getBase58Decoder().decode(ret['BvJrHm3rBx9ddmz4dzK4Jp8ibC8WSfYP5qipE7M1CbDx']);

  const approval = {
    fingerprint: solanaTokenTransferAuthorizationRequest.fingerprint,
    solanaBankTransferApproval: {
      signature,
      expirationTimestamp,
      nonce,
    },
  };

  console.log(approval);
}

// expected signature: 4aR7f1eaVbBfxQze5vgktZ18RP1tUYB28yiaRTBJDPgtpe4kcvAcMq3QM6C8HPTzVTS9RYxj9XdrwmGnpU52Fc5n
signRequest();

================================================================================
// File: examples/subscribeAllCardUpdates.js
================================================================================
const { ActionCable } = require('@sorare/actioncable');

const cable = new ActionCable({
  headers: {
    // 'Authorization': `Bearer <YourJWTorOAuthToken>`,
    // 'APIKEY': '<YourOptionalAPIKey>'
  }
});

cable.subscribe('anyCardWasUpdated(rarities: [limited, rare, super_rare, unique]) { slug }', {
  connected() {
    console.log("connected");
  },

  disconnected(error) {
    console.log("disconnected", error);
  },

  rejected(error) {
    console.log("rejected", error);
  },

  received(data) {
    if (data?.result?.errors?.length > 0) {
      console.log('error', data?.result?.errors);
      return;
    }
    const anyCardWasUpdated = data?.result?.data?.anyCardWasUpdated;
    if (!anyCardWasUpdated) {
      return;
    }
    const { slug } = anyCardWasUpdated;
    console.log('a card was updated', slug);
  }
});

cable.subscribe('bundledAuctionWasUpdated { id }', {
  received(data) {
    const bundledAuctionWasUpdated = data?.result?.data?.bundledAuctionWasUpdated;
    if (!bundledAuctionWasUpdated) {
      return;
    }
    const { id } = bundledAuctionWasUpdated;
    console.log('a bundled auction was updated', id);
  }
});

================================================================================
// File: examples/subscribeCurrentUserUpdates.js
================================================================================
const { ActionCable } = require('@sorare/actioncable');

const token = process.env['JWT_TOKEN'];
const jwtAud = process.env['JWT_AUD'];

if (!token) {
  throw new Error('Missing JWT_TOKEN environment variable');
}

if (!jwtAud) {
  throw new Error('Missing JWT_AUD environment variable');
}

const cable = new ActionCable({
  headers: {
    'Authorization': `Bearer ${token}`,
    'JWT-AUD': jwtAud,
  }
});

cable.subscribe('currentUserWasUpdated { slug nickname }', {
  connected() {
    console.log("connected");
  },

  disconnected(error) {
    console.log("disconnected", error);
    process.exit(1);
  },

  rejected(error) {
    console.log("rejected", error);
    process.exit(1);
  },

  received(data) {
    if (data?.result?.errors?.length > 0) {
      console.log('error', data?.result?.errors);
      process.exit(1);
      return;
    }
    const currentUserWasUpdated = data?.result?.data?.currentUserWasUpdated;
    if (!currentUserWasUpdated) {
      return;
    }
    const { slug } = currentUserWasUpdated;
    console.log('current user was updated', slug);
    process.exit(0);
  }
});

================================================================================
// File: examples/subscribeTokenWasUpdated.js
================================================================================
const { ActionCable } = require('@sorare/actioncable');

const cable = new ActionCable({
  headers: {
    // 'Authorization': `Bearer <YourJWTorOAuthToken>`,
    // 'APIKEY': '<YourOptionalAPIKey>'
  }
});

const tokenOfferWasUpdated = `tokenOfferWasUpdated {
  status
  actualReceiver {
    ... on User {
      slug
    }
  }
  sender {
    ... on User {
      slug
    }
  }
  senderSide {
    amounts {
      wei
      eur
      usd
      gbp
    }
    anyCards {
      assetId
    }
  }
  receiverSide {
    amounts {
      wei
      eur
      usd
      gbp
    }
    anyCards {
      assetId
    }
  }
}
`;

const tokenAuctionWasUpdated = `tokenAuctionWasUpdated {
  open
  bestBid {
    amounts {
      wei
      eur
      usd
      gbp
    }
    bidder {
      ... on User {
        slug
      }
    }
  }
  bids {
    nodes {
      amounts {
        wei
        eur
        usd
        gbp
      }
      bidder {
        ... on User {
          slug
        }
      }
    }
  }
  anyCards {
    assetId
  }
}
`;

cable.subscribe(tokenOfferWasUpdated, {
  connected() {
    console.log("connected");
  },

  disconnected(error) {
    console.log("disconnected", error);
  },

  rejected(error) {
    console.log("rejected", error);
  },

  received(data) {
    if (data?.result?.errors?.length > 0) {
      console.log('error', data?.result?.errors);
      return;
    }
    const tokenOffer = data?.result?.data;
    console.log('a token offer was updated', tokenOffer);
  }
});

cable.subscribe(tokenAuctionWasUpdated, {
  connected() {
    console.log("connected");
  },

  disconnected(error) {
    console.log("disconnected", error);
  },

  rejected(error) {
    console.log("rejected", error);
  },

  received(data) {
    if (data?.result?.errors?.length > 0) {
      console.log('error', data?.result?.errors);
      return;
    }
    const tokenOffer = data?.result?.data;
    console.log('a token auction was updated', tokenOffer);
  }
});

================================================================================
// File: examples/subscribe_all_card_updates.py
================================================================================
import websocket
import json
import time

w_socket = 'wss://ws.sorare.com/cable'
identifier = json.dumps({"channel": "GraphqlChannel"})

subscription_query = {
  "query": "subscription { anyCardWasUpdated { slug } }",
  "variables": {},
  "action": "execute"
}

def on_open(ws):
  subscribe_command = {"command": "subscribe", "identifier": identifier}
  ws.send(json.dumps(subscribe_command).encode())

  time.sleep(1)

  message_command = {
    "command": "message",
    "identifier": identifier,
    "data": json.dumps(subscription_query)
  }
  ws.send(json.dumps(message_command).encode())

def on_message(ws, data):
  message = json.loads(data)
  type = message.get('type')
  if type == 'welcome':
    pass
  elif type == 'ping':
    pass
  elif message.get('message') is not None:
    print(message['message'])

def on_error(ws, error):
  print('Error:', error)

def on_close(ws, close_status_code, close_message):
  print('WebSocket Closed:', close_message, close_status_code)

def long_connection():
  ws = websocket.WebSocketApp(
    w_socket,
    on_message=on_message,
    on_close=on_close,
    on_error=on_error,
    on_open=on_open
  )
  ws.run_forever()

if __name__ == '__main__':
  long_connection()

================================================================================
// File: web3/quicknodeFilters/collectionFilter.js
================================================================================
import { NFT_COLLECTION_ADDRESSES, BUBBLEGUM_PROGRAM_ID } from '../constants/solana';

function matchesProgram(tx) {
  return (
    tx.transaction?.message?.instructions?.some(
      ix => ix.programId === BUBBLEGUM_PROGRAM_ID
    ) ||
    tx.meta?.innerInstructions?.some(iix =>
      iix.instructions.some(ix => ix.programId === BUBBLEGUM_PROGRAM_ID)
    )
  );
}

function matchesCollection(tx) {
  return (
    tx.meta?.innerInstructions?.some(innerInstruction =>
      innerInstruction.instructions?.some(instruction =>
        NFT_COLLECTION_ADDRESSES.some(
          account =>
            instruction.accounts && instruction.accounts.includes(account)
        )
      )
    ) ||
    tx.transaction?.message?.accountKeys?.some(
      ({ pubkey }) => NFT_COLLECTION_ADDRESSES.includes(pubkey)
    )
  );
}

function formatTransaction(tx, stream) {
  const txData = {
    signature: tx.transaction.signatures[0],
    blockTime: stream.blockTime,
    blockHeight: stream.blockHeight,
    blockhash: stream.blockhash,
    isSuccessful: !tx.meta?.err,
    logs: [],
  };

  if (!txData.isSuccessful) {
    txData.logs = tx.meta.logMessages;
  }

  return txData;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function main(stream) {
  try {
    const transactions = [];

    for (let i = 0; i < stream.data.length; i += 1) {
      const block = stream.data[i];

      if (!block?.transactions) {
        return { error: 'Invalid or missing stream' };
      }

      const matchedTransactions = block.transactions
        .filter(tx => matchesProgram(tx) && matchesCollection(tx))
        .map(tx => formatTransaction(tx, block));

      transactions.push(...matchedTransactions);
    }

    if (transactions.length === 0) {
      return null;
    }

    return { metadata: stream.metadata, transactions };
  } catch (error) {
    console.error('Error in main function', error); // eslint-disable-line no-console

    return { error: error.message, stack: error.stack };
  }
}

module.exports = {
  main,
};

