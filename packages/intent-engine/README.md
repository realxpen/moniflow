# @moniflow/intent-engine

Phase 1 establishes this package as the boundary between natural language and a validated, structured financial intent.

Its later pipeline is:

`Natural language → normalized instruction → structured financial intent`

The Intent Engine may interpret and validate. It must never execute, authorize, or directly dispatch a financial operation, and it must not know BMONI endpoint names. No parser or AI integration is implemented in Phase 1.
