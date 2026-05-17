# Requirements Document

## Introduction

This document defines the requirements for SpecForge's core feature: Repository Analysis and Spec Generation. The feature allows users to submit a public GitHub repository URL, triggers an AI-powered analysis of the codebase, and generates a complete `.kiro/` folder containing spec files (requirements.md, design.md, tasks.md), steering documents (product.md, tech.md, structure.md), and suggested hooks. The user can preview and download the generated output as a structured `.zip` file.

## Glossary

- **SpecForge_UI**: The Next.js frontend application that provides the user interface for URL submission, progress display, file preview, and download.
- **Analysis_API**: The Next.js API route (`/api/analyze`) that orchestrates repository fetching, AI analysis, and spec generation on the server side.
- **GitHub_Fetcher**: The server-side module using Octokit REST client to retrieve repository metadata, file tree, and file contents from the GitHub API.
- **AI_Analyzer**: The server-side module that sends curated repository content to AWS Bedrock (Claude 3.5 Sonnet) and receives structured analysis results.
- **Spec_Generator**: The module that transforms AI analysis output into properly formatted `.kiro/` folder files (specs, steering, hooks).
- **URL_Validator**: The component responsible for validating that a submitted string is a well-formed, accessible public GitHub repository URL.
- **Progress_Reporter**: The mechanism (Server-Sent Events or polling) that communicates analysis progress from the server to the client.
- **File_Previewer**: The frontend component that renders generated spec files for in-browser review.
- **Download_Service**: The module that packages generated files into a `.zip` archive structured as a `.kiro/` folder.
- **Repository_Cache**: The optional S3-based cache that stores analysis results keyed by repository commit SHA.

## Requirements

### Requirement 1: Repository URL Submission

**User Story:** As a developer, I want to submit a public GitHub repository URL, so that SpecForge can analyze my codebase and generate specs for it.

#### Acceptance Criteria

1. THE SpecForge_UI SHALL display a text input field with a maximum length of 2048 characters and a submit button for entering a GitHub repository URL.
2. WHEN the user submits a URL that matches the pattern `https://github.com/{owner}/{repo}`, THE SpecForge_UI SHALL initiate the repository analysis process and display a loading indicator.
3. IF the user submits an empty input, THEN THE SpecForge_UI SHALL display a validation message indicating a URL is required.
4. IF the user submits a URL that does not match the pattern `https://github.com/{owner}/{repo}`, THEN THE SpecForge_UI SHALL display a validation message indicating the expected format.
5. IF the submitted URL matches the expected pattern but the repository does not exist or is not publicly accessible, THEN THE SpecForge_UI SHALL display a validation message indicating the repository could not be found or is not public.

### Requirement 2: Repository Accessibility Validation

**User Story:** As a developer, I want the system to verify my repository is accessible before starting analysis, so that I receive immediate feedback if something is wrong.

#### Acceptance Criteria

1. WHEN a well-formed GitHub URL is submitted, THE Analysis_API SHALL query the GitHub API to verify the repository exists and is publicly accessible within 10 seconds.
2. WHEN the GitHub API confirms the repository is public and accessible, THE Analysis_API SHALL proceed with repository fetching.
3. IF the repository does not exist, THEN THE Analysis_API SHALL return an HTTP 404 error response with a message indicating the repository was not found.
4. IF the repository is private or requires authentication, THEN THE Analysis_API SHALL return an HTTP 403 error response indicating that only public repositories are supported.
5. IF the GitHub API does not respond within 10 seconds or returns an HTTP 5xx status, THEN THE Analysis_API SHALL return an HTTP 502 error response indicating a temporary connectivity issue.
6. WHEN the accessibility validation completes with an error, THE Analysis_API SHALL return the error response within 15 seconds of the original submission.

### Requirement 3: Repository Content Fetching

**User Story:** As a developer, I want the system to intelligently fetch the most important files from my repository, so that the AI analysis is based on meaningful code without exceeding token limits.

#### Acceptance Criteria

1. WHEN repository accessibility is confirmed, THE GitHub_Fetcher SHALL retrieve the complete file tree structure of the repository's default branch.
2. WHEN the file tree is retrieved, THE GitHub_Fetcher SHALL identify and fetch key files including: README files (README, README.md, README.rst), package manifests (package.json, requirements.txt, Cargo.toml, pom.xml, go.mod, Gemfile, pyproject.toml), main entry point files (index.ts, index.js, main.ts, main.js, main.py, app.ts, app.js, app.py, server.ts, server.js), and configuration files (tsconfig.json, .eslintrc, next.config.js, vite.config.ts, webpack.config.js, docker-compose.yml, Dockerfile, Makefile).
3. THE GitHub_Fetcher SHALL fetch a maximum of 20 files total from the repository.
4. THE GitHub_Fetcher SHALL prioritize files in the following order: README, package manifests, configuration files, main entry points, and then source files by directory depth (shallower first), with files at the same depth ordered alphabetically by file name.
5. IF a single file exceeds 50KB in size, THEN THE GitHub_Fetcher SHALL truncate the file content to the first 50KB and include a truncation notice.
6. THE GitHub_Fetcher SHALL limit total fetched content to 100KB, stopping file retrieval once the cumulative size of already-fetched content reaches the limit, and excluding any subsequent files from the result set.
7. IF the repository contains more than 10,000 files in its tree, THEN THE Analysis_API SHALL return an error indicating the repository is too large for analysis.
8. THE GitHub_Fetcher SHALL skip binary files (images, compiled artifacts, fonts, archives) and only fetch files with text-based content, not counting skipped binary files toward the 20-file maximum.

### Requirement 4: AI-Powered Codebase Analysis

**User Story:** As a developer, I want the system to use AI to understand my codebase's architecture, tech stack, and features, so that the generated specs accurately reflect my project.

#### Acceptance Criteria

1. WHEN repository content is fetched, THE AI_Analyzer SHALL send the file tree and curated file contents (filtered to a combined payload of no more than 150,000 characters) to AWS Bedrock Claude 3.5 Sonnet for analysis.
2. THE AI_Analyzer SHALL include a structured prompt requesting identification of: detected programming languages, frameworks, architecture patterns, major features, component relationships, and entry points.
3. THE AI_Analyzer SHALL set a maximum response timeout of 120 seconds for the Bedrock API call.
4. IF the Bedrock API returns an error or times out, THEN THE AI_Analyzer SHALL retry the request once after a 5-second delay.
5. IF the retry also fails, THEN THE Analysis_API SHALL return an error response indicating the AI analysis could not be completed and including the failure reason (timeout or API error).
6. THE AI_Analyzer SHALL parse the Bedrock response as JSON and validate that it contains all six required analysis sections (detected programming languages, frameworks, architecture patterns, major features, component relationships, and entry points), each as a non-empty field.
7. IF the Bedrock response is not valid JSON or any of the six required analysis sections is missing or empty, THEN THE AI_Analyzer SHALL treat the response as a failure and follow the retry logic defined in criterion 4.

### Requirement 5: Requirements Document Generation

**User Story:** As a developer, I want the system to generate EARS-format requirements for the major features detected in my codebase, so that I have a structured starting point for spec-driven development.

#### Acceptance Criteria

1. WHEN AI analysis is complete, THE Spec_Generator SHALL produce a requirements.md file where every acceptance criterion follows exactly one EARS syntax pattern (Ubiquitous, Event-driven, State-driven, Unwanted event, Optional feature, or Complex) within 30 seconds of analysis completion.
2. THE Spec_Generator SHALL include a Glossary section defining every system name (actors, components, and domain objects) that appears as a subject or object in any requirement.
3. THE Spec_Generator SHALL generate at least one requirement for each major feature detected by the AI_Analyzer, where each requirement contains a user story in "As a [role], I want [feature], so that [benefit]" format and at least 2 acceptance criteria.
4. THE Spec_Generator SHALL number requirements sequentially (Requirement 1, Requirement 2, etc.) with acceptance criteria numbered within each requirement.
5. IF the AI_Analyzer detects zero major features from the repository, THEN THE Spec_Generator SHALL produce a requirements.md file containing a single requirement that describes the repository's overall purpose as inferred from its README or package metadata.

### Requirement 6: Design Document Generation

**User Story:** As a developer, I want the system to generate a design document describing my project's architecture, so that I have documentation of the technical decisions in my codebase.

#### Acceptance Criteria

1. WHEN AI analysis is complete, THE Spec_Generator SHALL produce a design.md file containing the following sections in order: architecture overview (a summary of the system's high-level structure in at least 2 sentences), tech stack (list of technologies), component descriptions (one entry per component detected), and data flow (description of how data moves between components).
2. WHEN AI analysis is complete, THE Spec_Generator SHALL list each detected technology as a named entry paired with a one-sentence description of what role that technology serves in the system (e.g., framework, database, build tool, hosting).
3. WHEN AI analysis is complete, THE Spec_Generator SHALL describe the relationship between each pair of components that interact, stating the direction of dependency and the nature of the interaction (e.g., "calls", "reads from", "subscribes to").
4. IF AI analysis completes but detects fewer than 2 components or fewer than 1 technology, THEN THE Spec_Generator SHALL produce the design.md with the available information and include a notice in the architecture overview section indicating that insufficient structural data was detected for a complete design document.

### Requirement 7: Tasks Document Generation

**User Story:** As a developer, I want the system to generate a tasks document identifying improvement opportunities, so that I have an actionable backlog for enhancing my codebase.

#### Acceptance Criteria

1. WHEN AI analysis is complete, THE Spec_Generator SHALL produce a tasks.md file containing between 5 and 50 implementation tasks, organized under category headings formatted as markdown level-2 headers.
2. THE Spec_Generator SHALL categorize tasks into at least the following groups: testing gaps, documentation improvements, refactoring opportunities, and feature enhancements, and MAY include additional categories relevant to the analyzed repository.
3. THE Spec_Generator SHALL format each task as a markdown checkbox item (`- [ ]`) followed by a description of 10 to 200 characters that identifies the target component or file area and the specific action to be performed.
4. IF AI analysis identifies no improvement opportunities for a given category, THEN THE Spec_Generator SHALL omit that category heading from the tasks.md file rather than including an empty section.

### Requirement 8: Steering Document Generation

**User Story:** As a developer, I want the system to generate steering documents (product.md, tech.md, structure.md), so that my team has context documents that guide future development with Kiro.

#### Acceptance Criteria

1. WHEN AI analysis is complete, THE Spec_Generator SHALL produce a product.md file within the `.kiro/steering/` output directory containing the following sections: project purpose (1-3 sentences summarizing what the project does), target users (identifying at least one user persona), and value proposition (1-2 sentences on core benefit), derived from the repository README and detected features.
2. WHEN AI analysis is complete, THE Spec_Generator SHALL produce a tech.md file within the `.kiro/steering/` output directory containing the following sections: detected tech stack (listing each identified language, framework, and major dependency), coding conventions (at least one observed pattern such as naming style or module structure), and architecture principles (at least one inferred principle about how the codebase is organized).
3. WHEN AI analysis is complete, THE Spec_Generator SHALL produce a structure.md file within the `.kiro/steering/` output directory containing the following sections: directory layout (listing top-level directories with a one-line description of each), naming conventions (at least one identified file or folder naming pattern), and file organization patterns (describing how source files are grouped).
4. IF the repository README is empty or absent, THEN THE Spec_Generator SHALL generate the product.md using only information inferred from the codebase and SHALL include a note in the product.md indicating that no README was available.
5. IF the Spec_Generator cannot detect any technology, convention, or pattern for a required section of a steering document, THEN THE Spec_Generator SHALL include a placeholder entry indicating that the section could not be auto-detected and requires manual input.

### Requirement 9: Hook Suggestions

**User Story:** As a developer, I want the system to suggest relevant Kiro hooks for my project, so that I can automate common development workflows.

#### Acceptance Criteria

1. WHEN AI analysis is complete, THE Spec_Generator SHALL generate 2 to 3 hook suggestion files based on the detected tech stack and project type.
2. THE Spec_Generator SHALL format each hook suggestion as a valid Kiro hook configuration containing an event type field (maximum 50 characters), an action field (maximum 200 characters), and a description field (maximum 300 characters).
3. THE Spec_Generator SHALL select hooks from a predefined set mapped to detected technologies, where each detected technology (JavaScript, TypeScript, Python, or test framework presence) maps to at least one corresponding hook (for example: lint-on-save for JavaScript projects, type-check for TypeScript projects, test-runner for projects with test frameworks).
4. IF the detected tech stack does not match any predefined hook mappings, THEN THE Spec_Generator SHALL generate 2 general-purpose hook suggestions applicable to any project (for example: format-on-save, commit-message-check).

### Requirement 10: File Preview

**User Story:** As a developer, I want to preview all generated files in the browser before downloading, so that I can verify the output quality and relevance.

#### Acceptance Criteria

1. WHEN spec generation is complete, THE SpecForge_UI SHALL display a file tree within 2 seconds showing all generated files (up to 50 files) organized hierarchically in the `.kiro/` folder structure with top-level folders expanded by default.
2. WHEN the user selects a file from the tree, THE File_Previewer SHALL render the file content (up to 500 KB) within 1 second with markdown formatting and syntax highlighting for at minimum markdown, TypeScript, and YAML content.
3. THE File_Previewer SHALL display the file path relative to the `.kiro/` root (up to 200 characters) for each previewed file.
4. THE SpecForge_UI SHALL allow the user to navigate between generated files without triggering a new analysis.
5. WHEN the file tree is first displayed, THE File_Previewer SHALL automatically select and render the first file in the tree.
6. IF a selected file fails to render, THEN THE File_Previewer SHALL display an error message indicating the file could not be previewed and retain the file tree in a navigable state.

### Requirement 11: Download as ZIP

**User Story:** As a developer, I want to download all generated files as a single `.zip` archive, so that I can drop the `.kiro/` folder directly into my repository.

#### Acceptance Criteria

1. WHEN the user clicks the download button and file generation is complete, THE Download_Service SHALL package all generated spec, steering, and hook files into a valid `.zip` archive that can be extracted by standard archive utilities.
2. THE Download_Service SHALL structure the archive with a top-level `.kiro/` directory containing `specs/`, `steering/`, and `hooks/` subdirectories.
3. THE Download_Service SHALL name the zip file using the pattern `{repo-name}-kiro-specs.zip`, where `repo-name` is the repository name with any characters outside `a-z`, `A-Z`, `0-9`, `-`, and `_` replaced by hyphens and truncated to a maximum of 100 characters.
4. THE Download_Service SHALL trigger a browser download of the zip file without requiring page navigation.
5. IF file generation has not completed when the user attempts to download, THEN THE Download_Service SHALL keep the download button disabled and display a message indicating that generation is still in progress.
6. IF the zip archive fails to be created, THEN THE Download_Service SHALL display an error message indicating the download could not be completed and allow the user to retry.

### Requirement 12: Error Handling

**User Story:** As a developer, I want clear error messages when something goes wrong, so that I understand what happened and whether I can retry.

#### Acceptance Criteria

1. IF the GitHub API returns a 403 status indicating rate limiting, THEN THE Analysis_API SHALL return an error response indicating the rate limit has been exceeded and include the UTC timestamp when the rate limit resets, or indicate that the reset time is unknown if the response header does not contain reset information.
2. IF the GitHub API returns a 404 status, THEN THE Analysis_API SHALL return an error response indicating the repository was not found or is not public.
3. IF the AI analysis fails, THEN THE Analysis_API SHALL retry the request up to 2 additional times with a 3-second delay between attempts before returning an error response indicating analysis failure.
4. IF the AI analysis fails after all retry attempts are exhausted, THEN THE SpecForge_UI SHALL display an error message with an option to retry the analysis.
5. IF the repository file tree exceeds 10,000 files or 500 MB total size, THEN THE SpecForge_UI SHALL display a message indicating the repository is too large and suggest trying a smaller repository.
6. IF an unexpected server error occurs (any unhandled exception or non-client error with 5xx status), THEN THE Analysis_API SHALL log the error details server-side and return an error response to the client containing only a generic failure indication without exposing stack traces, internal paths, or dependency names.
7. WHEN an error is displayed, THE SpecForge_UI SHALL provide a "Try Again" button that clears the repository URL input field and any previously displayed results, returning the form to its empty default state.

### Requirement 13: Progress Indication

**User Story:** As a developer, I want to see real-time progress during analysis, so that I know the system is working and approximately how long it will take.

#### Acceptance Criteria

1. WHEN analysis begins, THE SpecForge_UI SHALL display a progress indicator showing the name of the current analysis phase and an animated visual element indicating ongoing activity.
2. THE Progress_Reporter SHALL communicate at least the following phases to the client in order: validating repository, fetching files, analyzing codebase, generating specs, and complete.
3. WHEN the analysis transitions to a new phase, THE SpecForge_UI SHALL update the displayed phase name and progress indicator within 2 seconds of the phase change occurring on the server.
4. WHILE analysis is in progress, THE SpecForge_UI SHALL disable the submit button to prevent duplicate submissions.
5. IF the analysis exceeds 90 seconds without completion, THEN THE SpecForge_UI SHALL display a message indicating the analysis is taking longer than expected and present a cancel button alongside the option to continue waiting.
6. IF the user selects cancel during analysis, THEN THE SpecForge_UI SHALL abort the in-progress request, re-enable the submit button, and display a message indicating the analysis was cancelled.

### Requirement 14: Response Caching

**User Story:** As a developer, I want previously analyzed repositories to load instantly on repeat visits, so that I do not wait for redundant AI processing.

#### Acceptance Criteria

1. WHEN analysis completes successfully, THE Analysis_API SHALL store the generated output keyed by the repository's latest commit SHA on the default branch.
2. WHEN a repository URL is submitted, THE Analysis_API SHALL resolve the current commit SHA from the default branch via the GitHub API and check the Repository_Cache for an existing result matching that SHA within 5 seconds of the request.
3. IF a cached result exists for the current commit SHA, THEN THE Analysis_API SHALL return the cached result without performing AI analysis within 2 seconds of the request.
4. IF a cached result exists but the commit SHA has changed, THEN THE Analysis_API SHALL perform a fresh analysis and update the cache.
5. IF the Repository_Cache is unavailable during a read operation, THEN THE Analysis_API SHALL proceed with a fresh AI analysis and return the result to the user with no error displayed.
6. IF the cache write fails after analysis completes, THEN THE Analysis_API SHALL still return the analysis result to the user and indicate the failure only in server logs.
7. IF the GitHub API fails to resolve the current commit SHA, THEN THE Analysis_API SHALL return an error message indicating that the repository could not be reached and SHALL NOT perform AI analysis.
