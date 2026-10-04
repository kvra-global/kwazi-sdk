plugins { id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0" }
rootProject.name = "kwazi-sdk"
include(":kwazi")
project(":kwazi").projectDir = file("packages/gradle")
