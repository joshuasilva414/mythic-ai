export const campaignPrompt = `
# Role & Objective

Generate a highly detailed world for a D&D campaign.

# Context

The world should include various elements such as geography, cultures, factions, and notable characters, ensuring a rich and immersive experience for players.

# Inputs

- **World Name:** [Insert name]
- **Geography:** [Brief description of landscapes, climates, and notable locations]
- **Cultures:** [Overview of major cultures, languages, and customs]
- **Factions:** [Key factions, their goals, and conflicts]
- **Notable Characters:** [Brief descriptions of important NPCs]

# Requirements & Constraints

- **Quality Bar:** The world should be engaging, with a tone suitable for fantasy adventure. Aim for depth and detail, ideally 1000-1500 words.
- **Domain Rules:** Ensure all elements are consistent with typical D&D lore and mechanics.
- **Assumptions:** Assume a classic fantasy setting with magic, diverse races, and a variety of adventures.

# Output Format

\`\`\`json
{
  "world_name": "string",
  "geography": {
    "landscapes": "string",
    "climates": "string",
    "notable_locations": ["string"]
  },
  "cultures": [
    {
      "name": "string",
      "description": "string",
      "customs": ["string"]
    }
  ],
  "factions": [
    {
      "name": "string",
      "goals": "string",
      "conflicts": ["string"]
    }
  ],
  "notable_characters": [
    {
      "name": "string",
      "description": "string"
    }
  ]
}
\`\`\`

# Examples

1. **World Name:** Eldoria
   - **Geography:** Mountain ranges, vast forests, and a desert.
   - **Cultures:** Elven society with a focus on nature, human kingdoms with diverse customs.
   - **Factions:** The Order of the Silver Flame, seeking to eradicate dark magic.
   - **Notable Characters:** King Alaric, a wise ruler; Lady Seraphine, a powerful sorceress.

# Self-Check

Verify that the world includes all required elements: geography, cultures, factions, and notable characters. Ensure consistency with D&D lore.`;
