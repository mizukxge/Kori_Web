openapi: 3.1.0
content:
application/json:
schema:
$ref: '#/components/schemas/Health'
examples:
okExample:
value: { ok: true, app: "Kori" }
/readyz:
get:
summary: Readiness probe
operationId: getReady
responses:
'200':
description: Service is ready to receive traffic
content:
application/json:
schema:
$ref: '#/components/schemas/Ready'
examples:
readyExample:
value: { ready: true }
/version:
get:
summary: Returns the running API version
operationId: getVersion
responses:
'200':
description: Version OK
content:
application/json:
schema:
$ref: '#/components/schemas/Version'
examples:
versionExample:
value: { version: "0.1.0" }
components:
schemas:
Health:
type: object
additionalProperties: false
properties:
ok:
type: boolean
app:
type: string
required: [ok]
Ready:
type: object
additionalProperties: false
properties:
ready:
type: boolean
required: [ready]
Version:
type: object
additionalProperties: false
properties:
version:
type: string
description: Semantic version of the API deployment
example: 0.1.0
required: [version]
Error:
type: object
additionalProperties: false
properties:
error:
type: string
required: [error]