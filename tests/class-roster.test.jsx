// === v3.16.0 F2: Class Roster tests ===
// Tests:
//   - Schema migration: legacy shape → F2 shape with defaults
//   - migrateRoster drops invalid entries
//   - normalizeAssessment auto-computes accuracyPercent
//   - validateStudentName rejects empty/over-length
//   - studentToAssessment copies fields to formData shape
//   - RosterPanel renders add form, edit form, list
//   - Bulk buttons visible when roster non-empty
//   - SEN type badge shows when student has senType

// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

import {
    migrateStudent,
    migrateRoster,
    normalizeAssessment,
    validateStudentName,
    studentToAssessment,
    MAX_ROSTER_STUDENTS,
    MAX_NAME_LENGTH,
} from '../src/data/studentRosterSchema.js';
import { RosterPanel } from '../src/components/RosterPanel.jsx';

afterEach(() => cleanup());

const sampleStudent = {
    id: 'student_1700000000_abc12',
    name: '張小明',
    senType: 'ADHD',
    notes: '專注 5 分鐘',
    assessment: {
        date: '2026-07-09',
        totalMinutes: 30,
        totalQuestions: 10,
        correctCount: 7,
        accuracyPercent: 70,
        strengths: ['加法'],
        improvementAreas: ['減法'],
        previousScore: 60,
        currentScore: 75,
    },
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
};

describe('v3.16.0 F2 — schema migration', () => {
    it('migrates valid F2 student', () => {
        const m = migrateStudent(sampleStudent);
        expect(m.id).toBe('student_1700000000_abc12');
        expect(m.name).toBe('張小明');
        expect(m.senType).toBe('ADHD');
        expect(m.assessment.accuracyPercent).toBe(70);
    });

    it('returns null for invalid input', () => {
        expect(migrateStudent(null)).toBe(null);
        expect(migrateStudent({})).toBe(null);
        expect(migrateStudent({ id: 'x' })).toBe(null);  // missing name
    });

    it('migrates legacy shape (no senType / notes / assessment)', () => {
        const legacy = { id: 's1', name: 'Legacy', createdAt: 1700000000000 };
        const m = migrateStudent(legacy);
        expect(m.senType).toBe('');
        expect(m.notes).toBe('');
        expect(m.assessment.totalQuestions).toBe(0);
    });

    it('truncates over-length name', () => {
        const long = 'A'.repeat(100);
        expect(migrateStudent({ ...sampleStudent, name: long }).name.length).toBe(MAX_NAME_LENGTH);
    });

    it('migrateRoster drops nulls and migrates valid', () => {
        const result = migrateRoster([sampleStudent, null, { no_id: 'x' }, { id: 's2', name: 'B' }]);
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('張小明');
        expect(result[1].name).toBe('B');
    });

    it('normalizeAssessment auto-computes accuracyPercent when missing', () => {
        const a = normalizeAssessment({
            date: '2026-01-01', totalMinutes: 20, totalQuestions: 10,
            correctCount: 8,
        });
        expect(a.accuracyPercent).toBe(80);
    });

    it('normalizeAssessment respects explicit accuracyPercent=0', () => {
        // User-set 0 (overridden by re-compute would be wrong — respect user choice)
        const a = normalizeAssessment({
            date: '2026-01-01', totalMinutes: 20, totalQuestions: 10,
            correctCount: 8, accuracyPercent: 0,
        });
        expect(a.accuracyPercent).toBe(0);
    });

    it('normalizeAssessment returns defaults for empty input', () => {
        const a = normalizeAssessment(null);
        expect(a.totalQuestions).toBe(0);
        expect(a.accuracyPercent).toBe(0);
        expect(a.strengths).toEqual([]);
    });
});

describe('v3.16.0 F2 — helpers', () => {
    it('validateStudentName accepts valid name', () => {
        expect(validateStudentName('張小明')).toEqual({ ok: true, name: '張小明' });
    });

    it('validateStudentName trims whitespace', () => {
        expect(validateStudentName('  Tom  ')).toEqual({ ok: true, name: 'Tom' });
    });

    it('validateStudentName rejects empty', () => {
        expect(validateStudentName('').ok).toBe(false);
        expect(validateStudentName('   ').ok).toBe(false);
    });

    it('validateStudentName rejects over-length', () => {
        const long = 'A'.repeat(MAX_NAME_LENGTH + 1);
        expect(validateStudentName(long).ok).toBe(false);
    });

    it('studentToAssessment copies fields', () => {
        const a = studentToAssessment(sampleStudent);
        expect(a.studentName).toBe('張小明');
        expect(a.accuracyPercent).toBe(70);
        expect(a.strengths).toEqual(['加法']);
        expect(a.improvementAreas).toEqual(['減法']);
    });

    it('studentToAssessment fills date with locale string when empty', () => {
        const noDate = { ...sampleStudent, assessment: { ...sampleStudent.assessment, date: '' } };
        const a = studentToAssessment(noDate);
        expect(a.date).not.toBe('');
    });
});

describe('v3.16.0 F2 — RosterPanel rendering', () => {
    it('renders collapse button + count', () => {
        render(<RosterPanel theme="plain" roster={[]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} />);
        expect(screen.getAllByText(/班級 roster/)[0]).toBeTruthy();
        expect(screen.getAllByText(/0 \/ 30 學生/)[0]).toBeTruthy();
    });

    it('shows 新增學生 button when collapsed default', () => {
        render(<RosterPanel theme="plain" roster={[]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} />);
        expect(screen.getAllByText(/新增學生/)[0]).toBeTruthy();
    });

    it('click 新增學生 reveals add form with name/senType/notes fields', () => {
        render(<RosterPanel theme="plain" roster={[]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} />);
        // Initial trigger button is the only 新增學生 visible when form is collapsed
        fireEvent.click(screen.getAllByText(/新增學生/)[0]);
        expect(screen.getByPlaceholderText(/張小明/)).toBeTruthy();
        expect(screen.getByPlaceholderText(/課堂表現/)).toBeTruthy();
    });

    it('calls onAdd with form values when 新增學生 form submitted', () => {
        const onAdd = vi.fn(() => ({ ok: true }));
        render(<RosterPanel theme="plain" roster={[]} onAdd={onAdd} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} />);
        // 1. Initial trigger button (collapsed form, has no check icon)
        fireEvent.click(screen.getAllByText(/新增學生/)[0]);
        // 2. Fill name
        fireEvent.change(screen.getByPlaceholderText(/張小明/), { target: { value: 'New Student' } });
        // 3. Click submit button (form's 新增學生 — has Check icon, NOT the trigger)
        const buttons = screen.getAllByText(/新增學生/).map(el => el.closest('button')).filter(Boolean);
        // Submit is the button WITH the Check icon (rendered last in form)
        const submitBtn = buttons[buttons.length - 1];
        fireEvent.click(submitBtn);
        expect(onAdd).toHaveBeenCalledWith('New Student', expect.any(String), expect.any(String));
    });

    it('renders roster list with student name + SEN badge + assessment badge', () => {
        render(<RosterPanel theme="plain" roster={[sampleStudent]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} onApplyStudent={() => {}} />);
        expect(screen.getByText('張小明')).toBeTruthy();
        expect(screen.getByText('ADHD')).toBeTruthy();
        expect(screen.getByText(/已評估 \(70%\)/)).toBeTruthy();
    });

    it('shows bulk action buttons when roster non-empty', () => {
        render(<RosterPanel theme="plain" roster={[sampleStudent]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} onBulkGenerateAll={() => {}} onBulkPrintAllCerts={() => {}} />);
        expect(screen.getByText(/全部 generate \(1 人\)/)).toBeTruthy();
        expect(screen.getByText(/全部列印奬狀 \(1 份\)/)).toBeTruthy();
    });

    it('does NOT show bulk buttons when roster empty', () => {
        render(<RosterPanel theme="plain" roster={[]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} onBulkGenerateAll={() => {}} onBulkPrintAllCerts={() => {}} />);
        expect(screen.queryByText(/全部 generate/)).toBeNull();
    });

    it('click 載入 button calls onApplyStudent with student id', () => {
        const onApplyStudent = vi.fn();
        render(<RosterPanel theme="plain" roster={[sampleStudent]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} onApplyStudent={onApplyStudent} />);
        const loadBtn = screen.getByText(/載入/).closest('button');
        fireEvent.click(loadBtn);
        expect(onApplyStudent).toHaveBeenCalledWith(sampleStudent.id);
    });

    it('shows empty state text when roster empty', () => {
        render(<RosterPanel theme="plain" roster={[]} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} />);
        expect(screen.getByText(/空空如也/)).toBeTruthy();
    });

    it('disables 新增學生 button when roster at max', () => {
        const bigRoster = Array.from({ length: MAX_ROSTER_STUDENTS }, (_, i) => ({
            ...sampleStudent, id: `s${i}`, name: `Student ${i}`,
        }));
        render(<RosterPanel theme="plain" roster={bigRoster} onAdd={() => ({ ok: true })} onUpdate={() => ({ ok: true })} onRemove={() => ({ ok: true })} />);
        const btn = screen.getByText(/已達上限/).closest('button');
        expect(btn.hasAttribute('disabled')).toBe(true);
    });
});