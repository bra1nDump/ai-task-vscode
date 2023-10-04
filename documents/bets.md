# Development Speed

- Avoid creating UIs by any means nessesary - vscode is rich enough
- Avoid creating communication protocols - no server, keep in typescript
- Focus on a single IDE - vscode
- Use vscode apis when possible, for example getting symbol information, ast, etc
- Avoid session state - get what you see by keeping state in plain text

# Focus

- Features
  - Multi-file editing
  - Simple continuation at cursor
  - Language server integration for crawling compile errors
- User perceived speed
  - Partial result application
  - Effective encoding - it do not have llm reprint existing areas of code
- UX
  - Make use of markdown preview for session feedback (this is prior to notebooks)
  - Invoke using a special @run symbol or double enter
  - Inline comments with auto complete by the language server
  - Notebooks for more session like interactions

# Produce good side effects

- Publicaly write about accomplishments, for example diff benchmark?
- These problems are being worked on by the best in the idustry right now, and they will beat me or us to it. Lets go out with some lasting artifacts.
