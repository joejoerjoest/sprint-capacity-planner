# Capacity Planner for Jira

> Know your real sprint capacity before planning, not after committing.

Capacity Planner for Jira helps Scrum Masters and Delivery Managers calculate true sprint capacity by accounting for team leave, public holidays, and working days, giving an honest picture before sprint planning starts.

## Overview

Teams often plan a sprint against a headcount, not against the days people are actually available. Leave, public holidays, and partial working weeks quietly shrink real capacity, and the gap only shows up after the team has already over-committed. Capacity Planner surfaces that honest number before planning begins.

## Key features

- Calculates true sprint capacity by accounting for team leave, public holidays, and working days.
- Gives a realistic capacity figure before sprint planning starts, so the team commits the right amount of work.
- Lets you plan in your preferred unit, either hours or story points.
- Tracks each member's leave individually, so personal availability is reflected in the team total.
- Built for Agile and Scrum teams, with Scrum Masters and Delivery Managers as the primary users.

## Compatibility and requirements

- **Hosting:** Jira Cloud (built on Atlassian Forge).
- **Application:** Jira Software.
- **Category:** Project management.
- **Data handling:** The app does not store your Jira data outside Atlassian. It reads only the sprint and project information needed to calculate capacity, at the time you use it. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Installation

1. In Jira, open **Apps** in the top navigation, then **Explore more apps** (or open the Atlassian Marketplace).
2. Search for **Capacity Planner for Jira**.
3. Click **Get it now** (or **Install**) and follow the prompts.
4. Review and approve the permissions the app requests.

## Using the capacity planner

Once installed, open Capacity Planner from the **Apps** menu. The app guides you through four steps:

1. **Set up the sprint.** Enter the sprint, its duration, the capacity unit (hours or story points), the hours per day, and the hours per story point.
2. **Add members.** Click **Add Members** and enter each person's name and role.
3. **Plan leave.** Open the **Leave Planner** tab and enter each member's leave dates and leave type.
4. **View the capacity report.** Open the **Capacity Report** tab to see the team's available capacity for the selected sprint.

Behind the report, the app takes the working days in the sprint and subtracts public holidays and each member's booked leave, producing the team's true available capacity before you commit work. Use that figure to size the sprint commitment realistically.

## Frequently asked questions

**Who is this app for?**
Scrum Masters and Delivery Managers who want a realistic capacity figure before sprint planning, rather than discovering the shortfall after committing.

**What does it account for?**
Team leave, public holidays, and working days.

**What unit is capacity expressed in?**
Hours or story points, whichever you choose when setting up the sprint.

**Does the app store any of my Jira data outside Atlassian?**
No. The app does not store your Jira data. It reads only the information it needs to calculate capacity, at the time you use it.

## Support

For support, questions, or security matters, contact **security@jebanmartin.in**. See also [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

## Changelog

- **Capacity Planner for Jira** — current name and listing.
- Formerly **Sprint Capacity Planner for Jira**. The display name was updated. The permanent app key (`com.jonathanjebanmartin.sprint-capacity-planner`) and this repository name are unchanged, because the app key cannot be modified after creation.
