import { Hono } from "hono";
import { Controller } from "../utils/controller";
import { helpRequestService } from "../services/HelpRequestService";

@Controller("/tasks")
export class HelpRequestController {
  static controller = new Hono()
    .post("/", async (c) => {
      try {
        const body = await c.req.json();
        const result = await helpRequestService.createHelpRequest(body);
        return c.json(result, 201);
      } catch (error) {
        return c.json({ message: "Internal server error" }, 500);
      }
    })

    .get("/:id", async (c) => {
      try {
        const idParam = c.req.param("id");
        
        // Folosim Number() în loc de parseInt() pentru a nu transforma "1.5" în "1" pe ascuns
        const requestedId = Number(idParam);

        // --- SCUTUL 1: Erorile de input (400 Bad Request) ---
        // Verificăm dacă:
        // - nu este număr întreg (ex: "abc" sau "1.5")
        // - este mai mic sau egal cu 0
        // - depășește limita maximă de siguranță a bazei de date (previne SQL Overflow)
        if (!Number.isInteger(requestedId) || requestedId <= 0 || requestedId > Number.MAX_SAFE_INTEGER) {
          return c.json(
            { 
              success: false, 
              message: "Eroare: ID-ul furnizat este invalid. Trebuie sa fie un numar intreg pozitiv." 
            },
            400
          );
        }

        // --- SCUTUL 2: Căutarea în Baza de Date ---
        const foundTask = await helpRequestService.getHelpRequestById(requestedId);

        // --- SCUTUL 3: Erorile de negăsire (404 Not Found) ---
        // Drizzle poate returna null, undefined, sau un array gol []. Le verificăm pe toate.
        if (!foundTask || (Array.isArray(foundTask) && foundTask.length === 0)) {
          return c.json(
            { 
              success: false, 
              message: `Eroare: Task-ul cu ID-ul '${requestedId}' nu exista in sistem.` 
            },
            404
          );
        }

        // Extragem obiectul curat (dacă Drizzle a returnat un array de un element)
        const dataToReturn = Array.isArray(foundTask) ? foundTask[0] : foundTask;

        // --- SCUTUL 4: Succes (200 OK) ---
        return c.json({ success: true, data: dataToReturn }, 200);

      } catch (error) {
        // --- SCUTUL 5: Erorile Serverului (500 Internal Server Error) ---
        // Aici ajung doar "tragediile" (ex: a căzut serverul de baze de date)
        console.error(`Eroare critica la GET /tasks/${c.req.param("id")} :`, error);
        
        return c.json(
          { 
            success: false, 
            message: "Eroare interna a serverului. Va rugam incercati mai tarziu." 
          }, 
          500
        );
      }
    });


}