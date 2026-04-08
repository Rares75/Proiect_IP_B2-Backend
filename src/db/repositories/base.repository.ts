/**
 * Generic interface for interacting with the database.
 */
export interface IRepository<T, CreateDTO, UpdateDTO, IDType = string | number> {
    /**
     * Creates and inserts an object into the database.
     * @param data JS object following the database schema
     */
    create(data: CreateDTO): Promise<T>;

    /**
     * Finds the object with the given ID.
     */
    findById(id: IDType): Promise<T | undefined>;

    /**
     * @returns array of `limit` objects from the database starting at `offset`
     */
    findMany(limit?: number, offset?: number): Promise<T[]>;

    /**
     * Finds the first object matching the criteria.
     * @param criteria partial object serving as criteria
     */
    findFirstBy(criteria: Partial<T>): Promise<T | undefined>;

    update(id: IDType, data: UpdateDTO): Promise<T | undefined>;

    delete(id: IDType): Promise<boolean>;

    /**
     * Check if an object exists in the database.
     * @param id id of object
     */
    exists(id: IDType): Promise<boolean>;

    /**
     * Counts how many objects are in the database.
     */
    count(): Promise<number>;
}