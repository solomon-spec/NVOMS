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
  flat chapter workspace with `report-source.md` and `chapter-draft.md`
- `03-chapter-2-literature-review/`
  flat chapter workspace with `report-source.md` and `chapter-draft.md`
- `04-chapter-3-problem-analysis-and-modeling/`
  flat chapter workspace with `report-source.md` and `chapter-draft.md`
- `05-chapter-4-system-design/`
  flat chapter workspace with `report-source.md` and `chapter-draft.md`
- `06-chapter-5-system-implementation/`
  flat chapter workspace with `report-source.md` and `chapter-draft.md`
- `07-chapter-6-system-evaluation/`
  flat chapter workspace with `report-source.md` and `chapter-draft.md`
- `08-chapter-7-conclusion-and-recommendations/`
  flat chapter workspace with `report-source.md` and `chapter-draft.md`
- `09-references/`
  reference materials and citation work
- `10-appendices/`
  supporting appendices
- `assets/`
  shared diagrams, images, tables, and editable source files

## Notes

- the extracted source report is now split into `report-source.md` files across the chapter folders
- chapter folders are intentionally flat so each chapter keeps only `report-source.md` and `chapter-draft.md`
- the copied original sources are stored under `assets/source-files/original-report/`
- the copied report images are stored under `assets/images/report-original/`
- Mermaid versions of the major diagrams are stored under `assets/diagrams/mermaid/`
- Chapter Four support artifacts such as the subsystem write-up and database design files are stored under `assets/chapter-4-design/`
- Chapter Five implementation support artifacts such as API contract notes can be stored under `assets/chapter-5-implementation/`
- the section-to-file map is in `REPORT_SOURCE_INDEX.md`
- the rebuild manifest is in `REPORT_ASSEMBLY_MANIFEST.json`
- the reconstructed combined markdown output is written to `build/FinalYearProjectReport.reconstructed.md`
- the cleaner submission-oriented chapter drafts are written as `front-matter-draft.md`, `chapter-draft.md`, and `references-draft.md` files inside the corresponding chapter folders
- the combined submission-oriented markdown is written to `build/submission-draft.md`

## Recommended Workflow

1. use the generated `report-source.md` files as the baseline reference for the original report content
2. keep each chapter folder flat and do your editing in `report-source.md` and `chapter-draft.md`
3. keep major diagrams and editable Mermaid code under `assets/diagrams/mermaid/`
4. run `python3 documentation/tools/dissect_report.py` if the source HTML or report mapping changes
5. run `python3 documentation/tools/assemble_report.py` when you want one reconstructed markdown document again
6. run `python3 documentation/tools/refine_mermaid_diagrams.py` to reapply the refined Mermaid versions of the report diagrams
7. run `python3 documentation/tools/generate_chapter_drafts.py` to regenerate the cleaner chapter-draft files and the combined submission draft
8. keep implementation evidence and code explanations under Chapter 5
9. keep testing evidence and evaluation tables under Chapter 6
