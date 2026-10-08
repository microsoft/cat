# CAT

The Copilot Acceleration Team (CAT) is part of the Microsoft Copilot Studio engineering team. Our mission is to accelerate the adoption and success of Microsoft 365 Copilot and Copilot Studio.

This repository contains the source for the [CAT website](https://microsoft.github.io/cat), including adoption guidance, workshops, tools, programs, and downloadable resources.

## About the site

CAT is a static GitHub Pages site. There is no build step, package manager, or application server: HTML, CSS, JavaScript, images, and documents are served directly from the repository.

The site uses:

- [Fluent UI Web Components](https://learn.microsoft.com/fluent-ui/web-components/) and a custom Fluent 2-inspired design system
- Vanilla JavaScript for interactive experiences
- CSS custom properties for shared colors, spacing, typography, and light/dark themes
- YAML data for the AI webinar schedule

## Repository structure

| Path | Purpose |
| --- | --- |
| `index.html` | Main CAT landing page |
| `assets/` | Shared CSS, JavaScript, fonts, and Sass source |
| `images/` | Shared site images and social preview assets |
| `programs/` | AI webinars, hackathons, bootcamps, and other program pages |
| `programs/ai-webinar-sessions.yml` | Data source for AI webinar sessions |
| `agent-excellence/` | Agent Excellence workshop pages and local assets |
| `agent-platform-advisor/` | Agent Platform Advisor experience |
| `agent-platform-comic/` | Agent Platform comic |
| `copilot-summit/` | Copilot Summit resources |
| `envisioning-workshop/` | Agent envisioning workshop |
| `sparktank/` | SparkTank experience |
| `resources/` | Downloadable presentations and PDFs |
| `CHANGELOG.md` | Monthly record of notable site changes |

Some sections are self-contained and use their own styles or scripts. Check nearby files and existing patterns before introducing shared dependencies.

## Preview locally

Clone the repository and serve its root directory with any static HTTP server:

```bash
git clone https://github.com/microsoft/CAT.git
cd CAT
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Use an HTTP server rather than opening HTML files directly. Browser security restrictions can prevent pages such as the AI webinar schedule from loading local YAML through `fetch()`.

## Common updates

### Update the landing page

Edit `index.html`. Reuse the existing components and semantic CSS tokens in `assets/css/fluent.css` instead of adding hard-coded colors or one-off styles.

### Add or update an AI webinar

Edit `programs/ai-webinar-sessions.yml`. Keep entries in chronological order and follow the existing field names and date format:

```yaml
- date: "2026-08-19"
  time: "9:00 AM PT"
  title: "Session title"
  description: "Short session description."
  register_link: "https://example.com/register"
```

Only include optional links, labels, or regional fields when they apply to the session.

### Add a downloadable resource

1. Add the PDF or presentation to `resources/` with a descriptive filename.
2. Link to it using a repository-relative URL.
3. Verify the link and filename casing locally; GitHub Pages paths are case-sensitive.

### Update a workshop or subsection

Edit the files inside that section's directory. Preserve its local design and scripting conventions unless the change intentionally standardizes the section with the main site.

For every content or resource update, add a concise entry to `CHANGELOG.md`.

## Contribution checklist

Before opening a pull request:

- Preview every changed page at desktop and mobile widths.
- Check navigation, external links, downloads, and interactive controls.
- Confirm images include useful alternative text.
- Verify light and dark themes where the page supports them.
- Use semantic design tokens instead of hard-coded theme colors.
- Avoid adding frameworks or build tooling unless the site architecture is intentionally changing.
- Update `CHANGELOG.md`.

GitHub Pages publishes the static files after changes are merged according to the repository's Pages configuration.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
