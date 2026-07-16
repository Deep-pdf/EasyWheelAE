/**
 * Action
 *
 * Represents a single invocable command that EasyWheel Host can send
 * to Adobe After Effects via the EasyWheel AE extension.
 *
 * Phase 2+ fields (indicative):
 * - id: unique string identifier for the action
 * - label: display name shown in the wheel slice
 * - icon: path to an SVG asset within `assets/icons/`
 * - command: the AE scripting command to execute
 */
export interface Action {}
