import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectHarness } from '@angular/material/select/testing';
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
  let loader: HarnessLoader;

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
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('allows selecting a loaded category without an invalid placeholder value', async () => {
    const component = fixture.componentInstance;

    expect(component.form.controls.categoriaId.value).toBeNull();
    expect(component.form.controls.categoriaId.hasError('required')).toBe(true);
    expect(component.categorias()).toEqual(categorias);

    const select = await loader.getHarness(MatSelectHarness);
    await select.open();
    const options = await select.getOptions();
    expect(await Promise.all(options.map(option => option.getText()))).toEqual(['Analgésicos']);
    await options[0].click();
    fixture.detectChanges();

    expect(await select.getValueText()).toBe('Analgésicos');
    expect(component.form.controls.categoriaId.value).toBe(1);
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
