import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IPlanificacio } from '../models/planificacio.model';

@Injectable({
  providedIn: 'root',
})
export class PlanificacioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:4000/api/planificacions';

  getPlanificacions(): Observable<IPlanificacio[]> {
    return this.http.get<IPlanificacio[]>(this.apiUrl);
  }


  create(data: Omit<IPlanificacio, '_id'>): Observable<IPlanificacio> {
    return this.http.post<IPlanificacio>(this.apiUrl, data);
  }

  update(id: string, data: Partial<IPlanificacio>): Observable<IPlanificacio> {
    return this.http.put<IPlanificacio>(`${this.apiUrl}/${id}`, data);
  }

}
