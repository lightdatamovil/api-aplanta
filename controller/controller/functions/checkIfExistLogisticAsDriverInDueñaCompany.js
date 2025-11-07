import { LightdataORM } from "lightdata-tools";

export async function checkIfExistLogisticAsDriverInDueñaCompany({ db, syncCode }) {

    const [chofer] = await LightdataORM.select({
        db,
        table: 'sistema_usuarios_accesos',
        where: { codvinculacion: syncCode },
        select: ['usuario'],
    });

    if (!chofer || chofer.length === 0) {
        return;
    }

    return chofer.usuario;
}