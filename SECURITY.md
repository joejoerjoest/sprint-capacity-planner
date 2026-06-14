# Security Policy — Sprint Capacity Planner for Jira

Last updated: June 12, 2026

## Data Security
Sprint Capacity Planner is built entirely on Atlassian's Forge platform. 
All data and computation run within Atlassian's secured cloud infrastructure. 
The app does not transmit data to any external servers.

## Data Storage & Encryption
All app data (team member names, sprint dates, leave information) is stored 
using Forge Storage within your own Atlassian environment. Atlassian encrypts 
this data both in transit and at rest as part of its platform security.

## No External Egress
This app does not call, integrate with, or send data to any third-party 
service or external API. It is eligible for the "Runs on Atlassian" trust badge.

## Permissions
The app requests only the minimum Jira permissions required to function 
as a project page.

## Vulnerability Reporting
To report a security concern, contact: jjeban@gmail.com
We aim to acknowledge reports within 5 business days.

## Data Deletion
When the app is uninstalled, associated Forge Storage data is removed 
in accordance with Atlassian's data lifecycle policies.
