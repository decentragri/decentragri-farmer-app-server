/**
 * Represents the token scheme containing both a refresh token and an access token.
 *
 * @interface TokenScheme
 * @property {string} refreshToken - The refresh token used for obtaining a new access token.
 * @property {string} accessToken - The access token used for authentication and authorization.
 * @property {string} username - The username associated with the tokens.
 */
export interface TokenScheme {
  refreshToken: string
  accessToken: string
  userName: string
}
