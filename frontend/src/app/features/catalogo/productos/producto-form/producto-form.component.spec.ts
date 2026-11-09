import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Categoria } from '../../../../models/categoria.model';
import { CategoriaService } from '../../../../services/categoria.service';
import { ProductoService } from '../../../../services/producto.service';
import { ProductoFormComponent } from './producto-form.component';

describe('ProductoFormComponent category selection', () => {
  const categorias: Categoria[] = [
    { id: 1, nombre: 'Analgésicos', descripcion: 'Medicamentos para el dolor' }
  ];
  let categoriaService: { listar: () => Observable<Categoria[]> };
  let fixture: ComponentFixture<ProductoFormComponent>;

  beforeEach(async () => {
    categoriaService = { listar: () => of(categorias) };
    await TestBed.configureTestingModule({
      imports: [ProductoFormComponent],
      providers: [
        { provide: CategoriaService, useValue: categoriaService },
        { provide: ProductoService, useValue: {} },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        provideRouter([])
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ProductoFormComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('starts without an invalid placeholder value and loads selectable categories', () => {
    const component = fixture.componentInstance;

    expect(component.form.controls.categoriaId.value).toBeNull();
    expect(component.form.controls.categoriaId.hasError('required')).toBe(true);
    expect(component.categorias()).toEqual(categorias);

    component.form.controls.categoriaId.setValue(1);
    expect(component.form.controls.categoriaId.valid).toBe(true);
  });

  it('shows a retryable error when categories fail to load', () => {
    const component = fixture.componentInstance;
    const listarSpy = vi.spyOn(categoriaService, 'listar').mockReturnValue(
      throwError(() => new Error('Category service unavailable'))
    );

    component.cargarCategorias();
    fixture.detectChanges();

    expect(component.errorCategorias()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('No se pudieron cargar las categorías.');

    listarSpy.mockReturnValue(of(categorias));
    component.cargarCategorias();
    fixture.detectChanges();

    expect(component.errorCategorias()).toBe(false);
    expect(component.categorias()).toEqual(categorias);
  });
});
