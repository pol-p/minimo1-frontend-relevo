import { Usuario } from './usuario.model';

export interface IFita {
  descripcion: string;
  completada: boolean;
}

export interface IPlanificacio {
  _id?: string;
  usuario: string | Usuario;
  titulo: string;
  fites: IFita[];
  createdAt?: string;
  updatedAt?: string;
}
