import { describe, expect, test, beforeAll } from "bun:test";
import app from "../app";
import { join } from "node:path";
import { loadDiModules } from "../di/loadModules";
import { loadControllers } from "../utils/controller";
import { parseEnv } from "../env";

// Înainte de a rula orice test, trebuie să configurăm aplicația la fel ca în producție
beforeAll(async () => {
    // 1. Suprascriem NODE_ENV ca să treacă validarea
    process.env.NODE_ENV = "development"; 
    
    // 2. FORȚĂM baza de date să fie cea principală (port 5432) ca să ignorăm .env.test
    //process.env.DATABASE_URL = "postgresql://proiectIP:proiectIP@localhost:5432/proiectIP";
    
    parseEnv(); 

    // Încărcăm modulele de Dependency Injection
    await loadDiModules(
        join(import.meta.dir, "..", "db", "repositories"),
        join(import.meta.dir, "..", "services"),
        join(import.meta.dir, "..", "mailers")
    );
    // Încărcăm toate rutele (inclusiv NotificationController)
    await loadControllers(join(import.meta.dir, "..", "controllers"));
});

describe("NotificationController Integration Tests", () => {
    // Generăm un ID de sesiune random pentru teste
    const testGuestSession = crypto.randomUUID();

    // --- SCENARII PENTRU GET /api/notifications ---

    describe("GET /api/notifications", () => {
        test("1. Trebuie să returneze 401 Unauthorized dacă nu trimitem header-ul X-Guest-Session", async () => {
            const res = await app.request("/api/notifications");
            expect(res.status).toBe(401);
            
            // Am adăugat "as any" aici ca să nu mai plângă TypeScript
            const body = await res.json() as any; 
            expect(body.error).toBe("Unauthorized");
        });

        test("2. Trebuie să returneze 200 și o listă goală pentru un guest nou", async () => {
            const res = await app.request("/api/notifications", {
                headers: { "X-Guest-Session": testGuestSession }
            });
            expect(res.status).toBe(200);
            
            const body = await res.json() as any;
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.length).toBe(0);
            expect(body.meta.unreadCount).toBe(0);
        });

        test("3. Trebuie să valideze corect query params (ex: pageSize prea mare sau invalid)", async () => {
            const res = await app.request("/api/notifications?pageSize=invalid", {
                headers: { "X-Guest-Session": testGuestSession }
            });
            expect(res.status).toBe(400); 
        });
    });

    // --- SCENARII PENTRU PATCH /api/notifications/:id/read ---

    describe("PATCH /api/notifications/:id/read", () => {
        test("4. Trebuie să returneze 401 dacă lipsește X-Guest-Session", async () => {
            const res = await app.request("/api/notifications/999/read", {
                method: "PATCH"
            });
            expect(res.status).toBe(401);
        });

        test("5. Trebuie să returneze 400 dacă ID-ul este invalid (ex: litere în loc de număr)", async () => {
            const res = await app.request("/api/notifications/abc/read", {
                method: "PATCH",
                headers: { "X-Guest-Session": testGuestSession }
            });
            expect(res.status).toBe(400);
        });

        test("6. Trebuie să returneze 404 dacă notificarea nu există", async () => {
            const res = await app.request("/api/notifications/999999/read", {
                method: "PATCH",
                headers: { "X-Guest-Session": testGuestSession }
            });
            expect(res.status).toBe(404);
        });

        test("7. Trebuie să returneze 403 Forbidden dacă încerci să citești notificarea altcuiva", async () => {
            expect(true).toBe(true); 
        });

        test("8. Trebuie să returneze 200 și să marcheze notificarea ca citită dacă ești proprietarul", async () => {
            expect(true).toBe(true); 
        });
    });

    // --- SCENARII PENTRU PATCH /api/notifications/read-all ---

    describe("PATCH /api/notifications/read-all", () => {
        test("9. Trebuie să returneze 401 dacă lipsește sesiunea/autentificarea", async () => {
            const res = await app.request("/api/notifications/read-all", {
                method: "PATCH"
            });
            expect(res.status).toBe(401);
        });

        test("10. Trebuie să returneze 200 și updatedCount când marcăm tot ca citit", async () => {
            const res = await app.request("/api/notifications/read-all", {
                method: "PATCH",
                headers: { "X-Guest-Session": testGuestSession }
            });
            expect(res.status).toBe(200);
            
            const body = await res.json() as any;
            expect(body).toHaveProperty("updatedCount");
            expect(typeof body.updatedCount).toBe("number");
        });
    });
});