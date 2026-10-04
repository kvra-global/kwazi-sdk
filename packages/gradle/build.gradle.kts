plugins {
    `java-library`
    `maven-publish`
}

// JitPack builds tagged commits and serves them as com.github.kvra-global:kwazi-sdk:<tag>.
val jitpack = System.getenv("JITPACK") == "true"
group = if (jitpack) "${System.getenv("GROUP")}.${System.getenv("ARTIFACT")}" else "za.co.kvra"
version = if (jitpack) System.getenv("VERSION") else "0.2.1"

java {
    toolchain { languageVersion = JavaLanguageVersion.of(17) }
    withSourcesJar()
    withJavadocJar()
}

repositories { mavenCentral() }

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.13.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test { useJUnitPlatform() }

publishing {
    publications {
        create<MavenPublication>("kwazi") {
            artifactId = "kwazi"
            from(components["java"])
            pom {
                name = "Kwazi"
                description = "Kwazi developer API client: ground step-by-step tutoring for South African learners in your own sources."
                url = "https://kvra-global.github.io/kwazi-sdk/"
                licenses { license { name = "MIT"; url = "https://opensource.org/licenses/MIT" } }
                scm { url = "https://github.com/kvra-global/kwazi-sdk" }
            }
        }
    }
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/kvra-global/kwazi-sdk")
            credentials {
                username = System.getenv("GITHUB_ACTOR")
                password = System.getenv("GITHUB_TOKEN")
            }
        }
    }
}

tasks.javadoc { (options as StandardJavadocDocletOptions).addStringOption("Xdoclint:all,-missing", "-quiet") }
