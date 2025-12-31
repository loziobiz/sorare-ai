import type { SignInInput, SignInResponse } from "../types";

/**
 * Mutation per il login su Sorare
 */
export const SIGN_IN_MUTATION = `
  mutation signIn($input: signInInput!) {
    signIn(input: $input) {
      currentUser {
        slug
      }
      jwtToken(aud: "sorare-ai") {
        token
        expiredAt
      }
      otpSessionChallenge
      errors {
        message
        code
      }
    }
  }
`;

/**
 * Tipi per le variabili della mutation
 */
export type SignInVariables = {
  input: SignInInput;
};

/**
 * Interfaccia per la risposta della mutation signIn
 */
export type SignInMutationResponse = {
  signIn: SignInResponse;
};
