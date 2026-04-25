// src/utils/queryValidator.ts

export const validateTasksQuery = (query: any) => {
    //Paginare
    const page = query.page ? Number(query.page) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;

    if (!Number.isInteger(page) || page < 1) {
        return { error: "Eroare: 'page' trebuie sa fie minim 1." };
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        return { error: "Eroare: 'pageSize' trebuie sa fie intre 1 si 100." };
    }

    //Sortare 
    const sortBy = query.sortBy !== undefined ? query.sortBy : 'createdAt';
    const order = query.order !== undefined ? query.order.toUpperCase() : 'DESC';

    const validSortFields = ['createdAt', 'urgency'];
    const validOrders = ['ASC', 'DESC'];

    if (!validSortFields.includes(sortBy)) {
        return { error: `Eroare: 'sortBy' accepta doar: ${validSortFields.join(', ')}.` };
    }
    if (!validOrders.includes(order)) {
        return { error: `Eroare: 'order' accepta doar: ${validOrders.join(', ')}.` };
    }

    //Daca totul e valid, returnam parametrii curatati
    return {
        validData: { page, pageSize, sortBy, order }
    };
};