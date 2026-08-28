export class ConfigurationError extends Error {
  readonly code = "invalid_server_configuration";

  constructor() {
    super("Invalid server configuration");
    this.name = "ConfigurationError";
  }
}

export class IntegrationNotConfiguredError extends Error {
  readonly code = "integration_not_configured";

  constructor() {
    super("Integration is not configured");
    this.name = "IntegrationNotConfiguredError";
  }
}
