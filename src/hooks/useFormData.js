import { useState, useCallback } from 'react';
import { getInitialFormData } from '../data/schema.js';

// === useFormData Hook ===
// Centralizes formData state + helpers
// updateField / toggleSelection / batchUpdates 都用 functional setState
export const useFormData = () => {
    const [formData, setFormData] = useState(getInitialFormData());

    const updateField = useCallback((key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    const toggleSelection = useCallback((field, item) => {
        setFormData(prev => {
            const current = prev[field];
            if (current.includes(item)) {
                return { ...prev, [field]: current.filter(t => t !== item) };
            } else {
                return { ...prev, [field]: [...current, item] };
            }
        });
    }, []);

    const handleExampleChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const newExamples = [...prev.examples];
            newExamples[index] = { ...newExamples[index], [field]: value };
            return { ...prev, examples: newExamples };
        });
    }, []);

    const addExample = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            examples: [
                ...prev.examples,
                { text: "", level: "初階", count: 10, mechanism: "3選1答案" },
            ],
        }));
    }, []);

    const removeExample = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            examples: prev.examples.filter((_, i) => i !== index),
        }));
    }, []);

    const handleRuleChange = useCallback((index, value) => {
        setFormData(prev => {
            const newRules = [...prev.rules];
            newRules[index] = value;
            return { ...prev, rules: newRules };
        });
    }, []);

    const addRule = useCallback(() => {
        setFormData(prev => ({ ...prev, rules: [...prev.rules, ""] }));
    }, []);

    const removeRule = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            rules: prev.rules.filter((_, i) => i !== index),
        }));
    }, []);

    return {
        formData,
        setFormData,
        updateField,
        toggleSelection,
        handleExampleChange,
        addExample,
        removeExample,
        handleRuleChange,
        addRule,
        removeRule,
    };
};