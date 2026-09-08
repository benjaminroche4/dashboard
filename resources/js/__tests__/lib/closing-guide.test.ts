import { describe, expect, it } from 'vitest';
import {
    closingGuide,
    closingQuestionCount,
    guideLanguages,
    nextQuestion,
    questionText,
    sectionProgress,
} from '@/lib/closing-guide';

describe('closing guide', () => {
    it('lists six themed sections with unique question ids', () => {
        const ids = closingGuide.flatMap((section) =>
            section.questions.map((question) => question.id),
        );

        expect(closingGuide).toHaveLength(6);
        expect(closingGuide.map((section) => section.title)).toEqual([
            'Profil et situation du client',
            'Critères du logement',
            'Zone de recherche',
            'Budget et dossier',
            'Calendrier',
            'Accompagnement proposé',
        ]);
        expect(new Set(ids).size).toBe(ids.length);
        expect(closingQuestionCount).toBe(ids.length);
    });

    it('never says « staff » nor names the packages in English', () => {
        const text = JSON.stringify(closingGuide).toLowerCase();

        expect(text).not.toContain('staff');
        expect(text).not.toContain('guided');
        expect(text).not.toContain('entrusted');
    });

    it('offers every question in French and in English', () => {
        const questions = closingGuide.flatMap((section) => section.questions);

        expect(guideLanguages.map((option) => option.value)).toEqual([
            'fr',
            'en',
        ]);
        for (const question of questions) {
            expect(question.question).not.toBe('');
            expect(question.questionEn).not.toBe('');
            expect(question.questionEn).not.toBe(question.question);
        }

        const [
            {
                questions: [motivations],
            },
        ] = closingGuide;
        expect(questionText(motivations, 'fr')).toMatch(/^Où habitez-vous/);
        expect(questionText(motivations, 'en')).toMatch(/^Where do you live/);
    });

    it('counts the asked questions per section', () => {
        const [profile] = closingGuide;

        expect(sectionProgress(profile, new Set())).toEqual({
            asked: 0,
            total: 3,
        });
        expect(
            sectionProgress(profile, new Set(['motivations', 'pets', 'rent'])),
        ).toEqual({ asked: 2, total: 3 });
    });

    it('finds the next question in guide order, or null once everything is asked', () => {
        expect(nextQuestion(new Set())?.question.id).toBe('motivations');
        expect(
            nextQuestion(new Set(['motivations', 'occupants', 'pets'])),
        ).toMatchObject({
            section: { id: 'criteria' },
            question: { id: 'furnished' },
        });

        const all = new Set(
            closingGuide.flatMap((section) =>
                section.questions.map((question) => question.id),
            ),
        );
        expect(nextQuestion(all)).toBeNull();
    });
});
