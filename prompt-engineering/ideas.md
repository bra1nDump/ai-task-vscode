# Prompt engineering

- One of the issues I have experienced is the task extraction is not very reliable. Maybe I should manually extract a task using the @crust comments and provide it in a separate message to the model to highlight its importance.

Merging to change set into a single one
```
# [assistant, latest response]:
```md
<task>
- User has started a refactor to update error types in `krokiService.ts`
- Error types no longer reference `kroki` but now reference an abstract service type
- The refactor is not finished, causing compile errors
- Address compile errors by updating error types to match the abstract service type defined in `utils.ts`
</task>

<change>
<path>src/diagrams/services/krokiService.ts</path>
<range-to-replace>
48:      return { isValid: false, error: { type: 'rendering timed out' } }
59:      return { isValid: false, error: { type: 'kroki failed' } }
</range-to-replace>
<replacement>
      return { isValid: false, error: { type: 'rendering service timed out' } }
      return { isValid: false, error: { type: 'rendering service failed' } }
</replacement>
</change>
```