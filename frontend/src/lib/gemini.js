import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn("Falta VITE_GEMINI_API_KEY en el archivo .env");
}

export const genAI = new GoogleGenerativeAI(apiKey || 'dummy-key-to-prevent-crash');

/**
 * Llama a Gemini para obtener una respuesta del tutor.
 * @param {string} prompt El mensaje del usuario.
 * @param {string} systemContext El contexto del curso y las instrucciones.
 * @param {Array<{role: string, parts: Array<{text: string}>}>} history El historial de la conversación.
 */
export const getGeminiResponse = async (prompt, systemContext, history = []) => {
    if (!apiKey) {
        throw new Error("API Key de Gemini no configurada. Por favor añade VITE_GEMINI_API_KEY a tu archivo .env");
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemContext
        });

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error al llamar a Gemini:", error);
        throw error;
    }
};
