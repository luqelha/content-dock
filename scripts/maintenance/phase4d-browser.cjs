// Builds must exist first. The shared runner refuses existing projects/occupied
// ports and verifies tmpfs/loopback identity before migrating a fresh fixture.
process.env.ATLAS_REGRESSION_PHASE = "phase-4d";
require("../observability/database-regression.cjs");
