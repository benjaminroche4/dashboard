import { describe, expect, it } from 'vitest';
import { nextQuestion, questionCount, questionText } from '@/lib/closing-guide';
import { ownerClosingGuide } from '@/lib/owner-closing-guide';

describe('owner closing guide', () => {
    it('lists six owner-oriented themes with unique question ids in both languages', () => {
        const questions = ownerClosingGuide.flatMap(
            (section) => section.questions,
        );
        const ids = questions.map((question) => question.id);

        expect(ownerClosingGuide.map((section) => section.title)).toEqual([
            'Le bien',
            'Situation actuelle',
            'Attentes',
            'Conditions de location',
            'Calendrier',
            'Mandat proposé',
        ]);
        expect(new Set(ids).size).toBe(ids.length);
        expect(questionCount(ownerClosingGuide)).toBe(ids.length);
        for (const question of questions) {
            expect(question.questionEn).not.toBe('');
            expect(question.questionEn).not.toBe(question.question);
        }
        expect(
            questionText(questions[0] as (typeof questions)[number], 'en'),
        ).toMatch(/^Can you describe the property/);
    });

    it('never says « staff » and walks the guide in order', () => {
        expect(JSON.stringify(ownerClosingGuide).toLowerCase()).not.toContain(
            'staff',
        );
        expect(nextQuestion(new Set(), ownerClosingGuide)?.question.id).toBe(
            'description',
        );
        expect(
            nextQuestion(
                new Set(['description', 'furnished', 'works']),
                ownerClosingGuide,
            ),
        ).toMatchObject({
            section: { id: 'situation' },
            question: { id: 'occupancy' },
        });
    });
});
