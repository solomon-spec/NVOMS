# Final Draft Comparison

## Compared Files

- Source markdown: `/Users/tikursew/Documents/Final Year/paper/Final year Project Report 1-3.md`
- Generated final draft: `/Users/tikursew/Documents/Final Year/documentation/build/submission-draft.md`
- Fidelity reference: `/Users/tikursew/Documents/Final Year/documentation/build/FinalYearProjectReport.reconstructed.md`

## High-Level Result

Yes, there is a difference between the source `paper` markdown and the generated final draft.

The difference is partly intentional and partly a documentation-quality issue:

- The `paper` markdown is a raw export with formatting noise.
- The final draft is cleaner, normalized, and easier to submit.
- The final draft also includes Chapter Four material that is not part of the original `1-3` source export.

## Key Findings

### 1. Scope Difference

- `Final year Project Report 1-3.md` is mainly a source-style export for Chapters 1 to 3 plus references/front matter.
- `submission-draft.md` includes Chapters 1 to 4, including the enriched system design, subsystem decomposition, and database design sections.

### 2. Raw Export Noise in the Source File

The source markdown contains several export artifacts that should not be treated as final-document structure:

- heading anchors such as `{#chapter-one:-introduction}`
- inconsistent heading levels
- duplicated structural items such as list-of-tables/list-of-figures style export blocks
- formatting noise in front matter and contents sections

Because of this, the raw `paper` markdown is not the best baseline for final editing.

### 3. Final Draft Is Better Structured

The generated draft improves the document by:

- normalizing chapter and section headings
- separating content into cleaner academic sections
- linking diagram captions to Mermaid source where applicable
- integrating refined Chapter Four design content

### 4. Remaining Risk

The main remaining risk is not missing architecture content. The risk is submission-format fidelity:

- front matter may need stricter formatting to match the university guide
- lists of tables, figures, and abbreviations may need final typesetting
- references may need one final formatting pass for consistency
- figure and table numbering should be checked after the final assembly

## Recommended Solution

Use a three-layer documentation workflow:

### Layer 1. Raw Source Preservation

Keep the original and fidelity-preserving files unchanged:

- `/Users/tikursew/Documents/Final Year/paper/Final year Project Report 1-3.md`
- `/Users/tikursew/Documents/Final Year/documentation/build/FinalYearProjectReport.reconstructed.md`

Purpose:

- preserve original wording
- preserve traceability
- serve as the fallback source when checking whether a section was compressed too much

### Layer 2. Editable Chapter Drafts

Treat the chapter draft files in `/Users/tikursew/Documents/Final Year/documentation` as the real editing workspace.

Purpose:

- improve language
- keep chapter ownership clear
- make future reconstruction easier

### Layer 3. Submission Build

Treat `/Users/tikursew/Documents/Final Year/documentation/build/submission-draft.md` as the compiled submission draft only.

Purpose:

- final review
- style consistency checks
- export to Word/PDF later

## Practical Improvement Plan

To improve the final draft documentation, the best next step is:

1. Compare each chapter draft against `FinalYearProjectReport.reconstructed.md`, not against the raw `paper` markdown.
2. Restore any source wording that carries meaning but was over-compressed during cleanup.
3. Keep the cleaner heading structure from the submission draft.
4. Add a final compliance pass for:
   - title/front matter structure
   - acknowledgements and abstract
   - list of tables
   - list of figures
   - abbreviations
   - reference style consistency
5. Freeze figure, table, and section numbering only after the document is fully assembled.

## Best Interpretation

The final draft is better than the raw `paper` markdown as a working submission document, but it should be validated against the reconstructed source file to make sure no useful Chapter 1 to 3 detail was lost during cleanup.

## Recommended Master Files

- Source truth for content recovery: `/Users/tikursew/Documents/Final Year/documentation/build/FinalYearProjectReport.reconstructed.md`
- Best working submission draft: `/Users/tikursew/Documents/Final Year/documentation/build/submission-draft.md`
- Raw archival source only: `/Users/tikursew/Documents/Final Year/paper/Final year Project Report 1-3.md`
