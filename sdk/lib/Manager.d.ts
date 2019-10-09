export = Manager;
declare class Manager {
    constructor(id: any, client: any);
    __onInit(): void;
    __ready(): void;
    __crash(err: any): void;
}
