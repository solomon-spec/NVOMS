# Documentation Structure

This folder is organized to match the AASTU senior research guideline and the current NVOMS project report structure.

## Purpose

- keep the formal report chapters organized
- separate design artifacts from implementation notes
- make it easy to write the final document chapter by chapter

## Main Layout

- `00-guide-and-admin/`
  stores guideline references, source documents, and submission checklists
- `01-front-matter/`
  cover page, title page, acknowledgement, TOC, lists, and abstract
- `02-chapter-1-introduction/`
  introduction, objectives, scope, methodology, activity plan, budget, significance, and outline
- `03-chapter-2-literature-review/`
  related works, milestones and gaps, lessons learned
- `04-chapter-3-problem-analysis-and-modeling/`
  existing system analysis, requirements, use cases, dynamic models, and validation
- `05-chapter-4-system-design/`
  architecture, subsystem decomposition, database design, deployment, UI, integration, security, and design verification
- `06-chapter-5-system-implementation/`
  review of design, tools, and implementation write-up
- `07-chapter-6-system-evaluation/`
  test plans, results, and discussion
- `08-chapter-7-conclusion-and-recommendations/`
  conclusion and future recommendations
- `09-references/`
  reference materials and citation work
- `10-appendices/`
  supporting appendices
- `assets/`
  shared diagrams, images, tables, and editable source files

## Notes

- the extracted source report is now split into `report-source.md` files across the chapter folders
- the copied original sources are stored under `assets/source-files/original-report/`
- the copied report images are stored under `assets/images/report-original/`
- Mermaid versions of the major diagrams are stored under `assets/diagrams/mermaid/`
- the section-to-file map is in `REPORT_SOURCE_INDEX.md`
- the rebuild manifest is in `REPORT_ASSEMBLY_MANIFEST.json`
- the reconstructed combined markdown output is written to `build/FinalYearProjectReport.reconstructed.md`
- the cleaner submission-oriented chapter drafts are written as `front-matter-draft.md`, `chapter-draft.md`, and `references-draft.md` files inside the corresponding chapter folders
- the combined submission-oriented markdown is written to `build/NVOMS_Submission_Draft.md`
- the existing database design work has been placed under:
  `05-chapter-4-system-design/04-database-design/`

## Recommended Workflow

1. use the generated `report-source.md` files as the baseline reference for the original report content
2. write refined chapter drafts beside or on top of those source files inside the same numbered folders
3. keep major diagrams and editable Mermaid code under `assets/diagrams/mermaid/`
4. run `python3 documentation/tools/dissect_report.py` if the source HTML or report mapping changes
5. run `python3 documentation/tools/assemble_report.py` when you want one reconstructed markdown document again
6. run `python3 documentation/tools/refine_mermaid_diagrams.py` to reapply the refined Mermaid versions of the report diagrams
7. run `python3 documentation/tools/generate_chapter_drafts.py` to regenerate the cleaner chapter-draft files and the combined submission draft
8. keep implementation evidence and code explanations under Chapter 5
9. keep testing evidence and evaluation tables under Chapter 6
