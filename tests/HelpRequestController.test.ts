/// <reference types="bun-types" />
import { describe, expect, it, beforeAll, spyOn } from 'bun:test';
import { join } from 'node:path';
import app from '../src/app';
import { loadControllers } from '../src/utils/controller';
import { HelpRequestService } from '../src/services/HelpRequestService';

describe('GET /api/tasks/:id', () => {

    beforeAll(async () => {
        const controllersPath = join((import.meta as any).dir, '../src/controllers');
        await loadControllers(controllersPath);
    });

    
    it('ar trebui sa returneze 400 pentru TOATE tipurile de ID-uri invalide', async () => {
        const badInputs = [
            "abc",         // Litere / Text pur
            "@#!",         // Caractere speciale
            "-5",          // Numar negativ
            "0",           // Zero
            "3.14",        // Numar cu zecimale 
            "999999999999999999999999" // Numar urias (Overflow bazei de date)
        ];

        for (const badId of badInputs) {
            const response = await app.request(`/api/tasks/${badId}`);
            const body: any = await response.json();

            expect(response.status).toBe(400);
            expect(body.success).toBe(false);
            expect(body.message).toBe("Eroare: ID-ul furnizat este invalid. Trebuie sa fie un numar intreg pozitiv.");
        }
    });

    
    it('ar trebui sa returneze 404 pentru un task care nu exista', async () => {
        const fakeId = "999999"; // Un ID care nu a fost creat
        const response = await app.request(`/api/tasks/${fakeId}`);
        const body: any = await response.json();

        expect(response.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.message).toBe(`Eroare: Task-ul cu ID-ul '${fakeId}' nu exista in sistem.`);
    });

    
    it('ar trebui sa returneze 500 daca pica baza de date / serverul', async () => {
        // Simulam o pana de curent la baza de date pentru o secunda
        const mockError = spyOn(HelpRequestService.prototype, 'getHelpRequestById').mockRejectedValue(new Error("Baza de date a picat simulata!"));

        const response = await app.request(`/api/tasks/1`);
        const body: any = await response.json();

        expect(response.status).toBe(500);
        expect(body.success).toBe(false);
        expect(body.message).toBe("Eroare interna a serverului. Va rugam incercati mai tarziu.");

        mockError.mockRestore();
    });

    
    it('ar trebui sa returneze 200 si direct obiectul pentru un task valid', async () => {
        const validId = "2"; 
        
        const mockTask = {
            id: Number(validId),
            title: "Task de testare",
            description: "Ajutor la cumparaturi", // MessageContent 
            skillsNeeded: ["Curatenie"],          // string[] 
            urgency: "HIGH",                      // UrgencyLevel 
            status: "OPEN",                       // RequestStatus 
            anonymousMode: false,                 // bool 
            createdAt: new Date().toISOString(),  // datetime 
            category: "SOCIAL"                    // Category 
        };
        
        const mockSuccess = spyOn(HelpRequestService.prototype, 'getHelpRequestById').mockResolvedValue(mockTask as any);

        const response = await app.request(`/api/tasks/${validId}`);
        const body: any = await response.json();
            
        expect(response.status).toBe(200);

        expect(body.success).toBeUndefined();
        expect(body.data).toBeUndefined();

        expect(body.id).toBe(Number(validId)); 
        expect(body.title).toBe("Task de testare");
        expect(body.status).toBeDefined(); 
        expect(body.status).toBe("OPEN"); 
        
        expect(body.anonymousMode).toBe(false);

        mockSuccess.mockRestore();
    });

});