# PRD: CE Course Creation

## Overview

CE Course Creation helps the Editorial team build continuing education course packages from existing Broadridge Forefield source content. The first version focuses on creating a complete quiz-based CE package from selected articles. Sora video generation is a later enhancement.

## Primary User

The primary user is the Editorial team. They use the tool to create CE course packages, review the generated quiz material, and prepare courses for submission to governing bodies or downstream delivery systems.

## Problem

Today, CE course creation requires the team to gather related Forefield articles, read the material, create a quiz, prepare answer keys, and package the course for another system. The reading set may include one article or several related articles. Learners typically read a small bundle of articles and then answer a quiz sized to the amount of reading.

## Goals

- Let an Editorial user select 1 to 5 existing source content items.
- Help users find related content by tag, category, or theme.
- Generate a full CE course package from selected content.
- Generate multiple-choice quiz questions with citations back to the source articles.
- Provide a demo quiz-taking experience for internal review.
- Prepare a future path for one-button delivery to AdvisorStream.
- Leave room for later course submission automation, such as email-based submission to governing bodies.
- Defer Sora video generation until quiz/course creation works well.

## First Version Scope

The first version should generate:

- Course title.
- Learning objective.
- Selected article list.
- Quiz.
- Answer key.
- Passing score.
- Completion notes.
- Source citations for each quiz question.
- Preview/take-quiz demo experience.

## Source Selection

Users should be able to manually select 1 to 5 Forefield content items from existing sources.

The source selection experience should include:

- Tag filtering toggle.
- Category/theme filtering for topics such as Bonds, 529 Plans, and Homeowners Insurance.
- Recommendations for related articles under the same theme or category.
- Clear selected-source review before generation.

## Quiz Rules

- Question type: multiple choice only.
- Choices per question: 4.
- Minimum questions: 10.
- Maximum questions: 25.
- Target generation rule: roughly 5 questions per selected article.
- If only one article is selected, still generate at least 10 questions.
- Difficulty: easy to medium.
- Tone: confirm the learner read and understood the content, not trick questions.
- Passing score: 60%.
- Citations: each question should cite the source article it came from.

## Demo Quiz Experience

The app should provide a simple learner-style preview so Editorial can test and demo the quiz before sending it elsewhere.

The preview should show:

- Course title.
- Learning objective.
- Reading list.
- Quiz questions.
- Four choices per question.
- Result state based on the 60% passing score.
- Answer key and source citations for review.

## Out of Scope for First Version

- Audit trail.
- Approval workflow.
- Governing body submission automation.
- Sora video generation.
- Full learner account management.
- Production quiz hosting as the final learner destination.

## Later Enhancements

- One-button "Send Quiz to AdvisorStream" workflow.
- Automated course submission support for governing bodies, possibly through an email workflow.
- Sora video generation from the selected course articles.
- Video module packaging with runtime, completion threshold, and attestation text.
- Export formats for external CE/course systems.

## Open Questions

- Which exact source fields should be shown in the course reading list?
- What export format does AdvisorStream need?
- Should generated quiz questions be editable before export?
- Should source citations be visible to learners, reviewers only, or both?
- Which governing bodies have the most important submission requirements?
