import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanificacioService } from '../../services/planificacio.service';
import { IPlanificacio } from '../../models/planificacio.model';
import { Usuario } from '../../models/usuario.model';
import { UsuarioService } from '../../services/usuario.service';
import { SearchInputComponent } from '../shared/search-input/search-input.component';
import { NotificationService } from '../../services/notification.service';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-planificacio',
  standalone: true,
  imports: [CommonModule, SearchInputComponent, ReactiveFormsModule],
  templateUrl: './planificacio.component.html',
  styleUrl: './planificacio.component.css'
})
export class PlanificacioComponent implements OnInit {
  private planService = inject(PlanificacioService);
  private usuarioService = inject(UsuarioService);
  private ns = inject(NotificationService);

  // Data Signals
  planificacions = signal<IPlanificacio[]>([]);
  usuarios = signal<Usuario[]>([]);
  isLoading = signal<boolean>(true);

  // Formulario de creación
  planForm = new FormGroup({
    usuario: new FormControl('', [Validators.required]),
    titulo: new FormControl('', [Validators.required, Validators.minLength(3)]),
    fitaDesc: new FormControl('', [Validators.required, Validators.minLength(3)])
  });

  // Local Filtering & Pagination Signals
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);

  // Filtrado como vemso tanto de Title como de username
  filteredPlans = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.planificacions();

    if (!query) return all;

    return all.filter(p => {
      const matchesTitle = p.titulo.toLowerCase().includes(query);
      const userName = typeof p.usuario !== 'string' ? p.usuario.fullName.toLowerCase() : '';
      return matchesTitle || userName.includes(query);
    });
  });

  // Paginacin Frontend
  paginatedPlans = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPlans().slice(start, start + this.pageSize());
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPlans().length / this.pageSize()))
  );

  ngOnInit(): void {
    this.cargarPlanificacions();
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (data) => this.usuarios.set(data),
      error: () => this.ns.error('Error al cargar usuarios')
    });
  }

  cargarPlanificacions(): void {
    this.isLoading.set(true);
    this.planService.getPlanificacions().subscribe({
      next: (data) => {
        this.planificacions.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.ns.error('Error al cargar planificaciones');
        this.isLoading.set(false);
      }
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  // Marcar como actualiazada
  toggleFita(plan: IPlanificacio, index: number): void {
    const fitesActualizadas = plan.fites.map((f, i) =>
      i === index ? { ...f, completada: !f.completada } : f
    );

    this.planService.update(plan._id!, { fites: fitesActualizadas }).subscribe({
      next: (actualizado) => {
        this.planificacions.update(prev =>
          prev.map(p => p._id === actualizado._id ? actualizado : p)
        );
        this.ns.success('Hito actualizado');
      },
      error: () => this.ns.error('Error al actualizar')
    });
  }

  addFita(plan: IPlanificacio, inputElement: HTMLInputElement): void {
    const descripcion = inputElement.value;
    if (!descripcion.trim()) return;

    const nuevasFites = [...plan.fites, { descripcion, completada: false }];

    this.planService.update(plan._id!, { fites: nuevasFites }).subscribe({
      next: (actualizado) => {
        this.planificacions.update(prev =>
          prev.map(p => p._id === actualizado._id ? actualizado : p)
        );
        inputElement.value = ''; // Limpiamos el input
        this.ns.success('Nueva fita añadida');
      },
      error: () => this.ns.error('Error al añadir fita')
    });
  }

  getProgreso(plan: IPlanificacio): number {
    if (!plan.fites.length) return 0;
    const completed = plan.fites.filter(f => f.completada).length;
    return Math.round((completed / plan.fites.length) * 100);
  }

  getUsuarioName(usuario: string | Usuario): string {
    if (typeof usuario === 'string') return 'Carregant...';
    return usuario?.fullName || 'Usuari Desconegut';
  }

  crearPlanificacio(): void {
    if (this.planForm.invalid) return;

    const val = this.planForm.value;
    const nueva: any = {
      usuario: val.usuario,
      titulo: val.titulo,
      fites: [
        { descripcion: val.fitaDesc, completada: false }
      ]
    };

    this.planService.create(nueva).subscribe({
      next: (res) => {
        // Solución Frontend: Si el servidor solo devuelve el ID, buscamos el usuario 
        // completo en nuestra lista local de usuarios y lo asignamos.
        if (typeof res.usuario === 'string') {
          const usuarioCompleto = this.usuarios().find(u => u._id === res.usuario);
          if (usuarioCompleto) {
            res.usuario = usuarioCompleto;
          }
        }

        this.planificacions.update(prev => [res, ...prev]);
        this.planForm.reset();
        this.ns.success('Planificació creada amb èxit');
      },
      error: () => this.ns.error('Error al crear la planificació')
    });
  }

  goToPage(delta: number): void {
    const next = this.currentPage() + delta;
    if (next >= 1 && next <= this.totalPages()) {
      this.currentPage.set(next);
    }
  }
}
