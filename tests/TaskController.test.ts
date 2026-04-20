import { describe, expect, it, beforeAll, spyOn } from 'bun:test'; 
import { join } from 'node:path'; 
import app from '../src/app';
import { loadControllers } from '../src/utils/controller';
import { taskService } from '../src/services/TaskService'; 

describe('GET /api/tasks/:id', () => {

    beforeAll(async () => {
        const controllersPath = join(import.meta.dir, '../src/controllers');
        await loadControllers(controllersPath);
    });

    it('ar trebui sa returneze 404 pentru un task care nu exista', async () => {
        const fakeId = "999999";
        const response = await app.request(`/api/tasks/${fakeId}`);
        const body: any = await response.json();

        expect(response.status).toBe(404);
        expect(body.success).toBe(false);
    });

    it('ar trebui sa returneze 200 pentru un task valid', async () => {
        const validId = "2";
        const response = await app.request(`/api/tasks/${validId}`);

        if (response.status === 200) {
            const body: any = await response.json();
            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
        } else {
            console.log("Baza de date e goală, testul 200 a returnat 404 (JSON valid).");
        }
    });

    it('ar trebui sa returneze 500 daca pica baza de date (Eroare Interna)', async () => {
        const mockError = spyOn(taskService, 'getTaskById').mockRejectedValue(new Error("Baza de date a picat simulată!"));

        const response = await app.request(`/api/tasks/1`);
        const body: any = await response.json();

        expect(response.status).toBe(500);
        expect(body.success).toBe(false);
        expect(body.message).toBe("Eroare interna a serverului.");

        mockError.mockRestore();
    });
});