// MA-365 on Azure Container Apps. Single replica + Azure Files volume (the prototype store is a JSON file).
// For multi-replica production, replace the file store with Cosmos DB / Postgres.
targetScope = 'resourceGroup'

param location string = resourceGroup().location
@minLength(3)
@maxLength(7)
param prefix string = 'ma365'
@description('Container image (set after `az acr build`). Leave empty on the first pass to create only the registry.')
param image string = ''
@secure()
param tokenEncKey string
param googleClientId string = ''
@secure()
param msClientSecret string = ''
param msClientId string = ''
@description('Extra browser origins allowed to call the API (e.g. https://illmedicine.github.io)')
param allowedOrigins string = ''

var uniq = uniqueString(resourceGroup().id)
var acrName = '${prefix}acr${uniq}'
var appName = '${prefix}-app'
var saName = '${prefix}sa${uniq}'
var deployApp = !empty(image)

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName, location: location, sku: { name: 'Basic' }, properties: { adminUserEnabled: false }
}
resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-id', location: location
}
resource pull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr, name: guid(acr.id, uami.id, 'acrpull')
  properties: { principalId: uami.properties.principalId, principalType: 'ServicePrincipal', roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') }
}
resource logs 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs', location: location, properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}
resource env 'Microsoft.App/managedEnvironments@2024-03-01' = if (deployApp) {
  name: '${prefix}-env', location: location
  properties: { appLogsConfiguration: { destination: 'log-analytics', logAnalyticsConfiguration: { customerId: logs.properties.customerId, sharedKey: logs.listKeys().primarySharedKey } } }
}
resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = if (deployApp) {
  name: saName, location: location, kind: 'StorageV2', sku: { name: 'Standard_LRS' }
  properties: { minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false, supportsHttpsTrafficOnly: true }
}
resource fileSvc 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = if (deployApp) {
  parent: sa
  name: 'default'
}
resource share 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = if (deployApp) {
  parent: fileSvc
  name: 'ma365data'
  properties: { shareQuota: 5 }
}
resource envStorage 'Microsoft.App/managedEnvironments/storages@2024-03-01' = if (deployApp) {
  parent: env, name: 'data'
  properties: { azureFile: { accountName: sa.name, accountKey: sa!.listKeys().keys[0].value, shareName: 'ma365data', accessMode: 'ReadWrite' } }
  dependsOn: [share]
}
resource app 'Microsoft.App/containerApps@2024-03-01' = if (deployApp) {
  name: appName, location: location, identity: { type: 'UserAssigned', userAssignedIdentities: { '${uami.id}': {} } }
  dependsOn: [envStorage, pull]
  properties: {
    managedEnvironmentId: env!.id
    configuration: {
      ingress: { external: true, targetPort: 8787, transport: 'auto', allowInsecure: false }
      registries: [{ server: acr.properties.loginServer, identity: uami.id }]
      secrets: [{ name: 'token-enc-key', value: tokenEncKey }, { name: 'ms-client-secret', value: empty(msClientSecret) ? 'unset' : msClientSecret }]
    }
    template: {
      containers: [{
        name: 'ma365', image: image, resources: { cpu: json('0.5'), memory: '1Gi' }
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PUBLIC_URL', value: 'https://${appName}.${env!.properties.defaultDomain}' }
          { name: 'ALLOWED_ORIGINS', value: allowedOrigins }
          { name: 'CROSS_SITE', value: empty(allowedOrigins) ? '0' : '1' }
          { name: 'GOOGLE_CLIENT_ID', value: googleClientId }
          { name: 'MS_CLIENT_ID', value: msClientId }
          { name: 'MS_CLIENT_SECRET', secretRef: 'ms-client-secret' }
          { name: 'TOKEN_ENC_KEY', secretRef: 'token-enc-key' }
        ]
        volumeMounts: [{ volumeName: 'data', mountPath: '/data' }]
        probes: [{ type: 'Liveness', httpGet: { path: '/healthz', port: 8787 } }]
      }]
      scale: { minReplicas: 1, maxReplicas: 1 }
      volumes: [{ name: 'data', storageType: 'AzureFile', storageName: 'data' }]
    }
  }
}
output acrName string = acr.name
output url string = !deployApp ? '' : 'https://${appName}.${env!.properties.defaultDomain}'
