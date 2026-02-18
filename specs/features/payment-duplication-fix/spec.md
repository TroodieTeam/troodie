# Payment Duplication Fix Technical Specification

> Status: APPROVED
> Created: 2026-02-17
> Source: Raw ticket — Payment Duplication Bug
> Feature: payment-duplication-fix

## Overview

Fix a critical payment bug where each deliverable approval triggers a separate full-amount payout. Payment should trigger only once per campaign application when ALL deliverables are approved.

## Stakeholder Decisions

- Q1: Option A — Pay only when ALL deliverables approved (rejected must be resubmitted)
- Q2: Option B — Run audit query for historical overpayments, manual refund review
- Q3: Option C — Both progress indicator UI and toast notification
- Q4: Typical campaigns have 3 deliverables
