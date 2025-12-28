import { describe, it, expect } from 'vitest';
import {
  produtoSchema,
  clienteSchema,
  fornecedorSchema,
  sanitizeFormData,
  prepareForDatabase,
  formatCPF,
  formatCNPJ,
  formatTelefone,
  formatCEP,
} from './validations';

describe('produtoSchema', () => {
  it('should validate valid produto data', () => {
    const validData = {
      nome: 'Produto Teste',
      codigo: 'PROD001',
      descricao: 'Descrição do produto',
      preco_compra: 100,
      preco_venda: 150,
      fornecedor_id: 'uuid-123',
    };

    const result = produtoSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject produto without required fields', () => {
    const invalidData = {
      codigo: 'PROD001',
      preco_compra: 100,
    };

    const result = produtoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('nome'))).toBe(true);
      expect(result.error.issues.some(i => i.path.includes('preco_venda'))).toBe(true);
    }
  });

  it('should reject negative prices', () => {
    const invalidData = {
      nome: 'Produto',
      preco_compra: -10,
      preco_venda: 150,
    };

    const result = produtoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields as null', () => {
    const validData = {
      nome: 'Produto',
      preco_compra: 100,
      preco_venda: 150,
      codigo: null,
      descricao: null,
      fornecedor_id: null,
    };

    const result = produtoSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('clienteSchema', () => {
  it('should validate valid cliente data', () => {
    const validData = {
      nome: 'João Silva',
      cpf: '123.456.789-00',
      telefone: '(11) 98765-4321',
      email: 'joao@example.com',
    };

    const result = clienteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      nome: 'João Silva',
      email: 'invalid-email',
    };

    const result = clienteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('email'))).toBe(true);
    }
  });

  it('should reject nome that is too long', () => {
    const invalidData = {
      nome: 'a'.repeat(101),
    };

    const result = clienteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('fornecedorSchema', () => {
  it('should validate valid fornecedor data', () => {
    const validData = {
      nome: 'Fornecedor LTDA',
      cnpj: '12.345.678/0001-90',
      telefone: '(11) 3456-7890',
      email: 'contato@fornecedor.com',
      site: 'https://fornecedor.com',
    };

    const result = fornecedorSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL in site field', () => {
    const invalidData = {
      nome: 'Fornecedor',
      site: 'not-a-valid-url',
    };

    const result = fornecedorSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('site'))).toBe(true);
    }
  });
});

describe('sanitizeFormData', () => {
  it('should trim all string fields', () => {
    const data = {
      nome: '  João  ',
      email: '  joao@example.com  ',
      idade: 25,
    };

    const result = sanitizeFormData(data);
    expect(result.nome).toBe('João');
    expect(result.email).toBe('joao@example.com');
    expect(result.idade).toBe(25);
  });

  it('should handle nested objects', () => {
    const data = {
      nome: '  Test  ',
      address: {
        street: '  Main St  ',
      },
    };

    const result = sanitizeFormData(data);
    expect(result.nome).toBe('Test');
  });

  it('should handle empty strings', () => {
    const data = {
      nome: '   ',
      email: '',
    };

    const result = sanitizeFormData(data);
    expect(result.nome).toBe('');
    expect(result.email).toBe('');
  });
});

describe('prepareForDatabase', () => {
  it('should convert empty strings to null', () => {
    const data = {
      nome: 'Test',
      email: '',
      telefone: '   ',
    };

    const result = prepareForDatabase(data);
    expect(result.nome).toBe('Test');
    expect(result.email).toBeNull();
    expect(result.telefone).toBeNull();
  });

  it('should keep non-empty strings', () => {
    const data = {
      nome: 'Test',
      email: 'test@example.com',
    };

    const result = prepareForDatabase(data);
    expect(result.nome).toBe('Test');
    expect(result.email).toBe('test@example.com');
  });
});

describe('formatCPF', () => {
  it('should format CPF correctly', () => {
    expect(formatCPF('12345678900')).toBe('123.456.789-00');
    expect(formatCPF('123.456.789-00')).toBe('123.456.789-00');
  });

  it('should handle partial input', () => {
    expect(formatCPF('123')).toBe('123');
    expect(formatCPF('12345678')).toBe('123.456.78');
  });

  it('should remove non-numeric characters', () => {
    expect(formatCPF('abc123def456')).toBe('123.456');
  });

  it('should limit to 14 characters (formatted)', () => {
    expect(formatCPF('123456789001234')).toBe('123.456.789-00');
  });
});

describe('formatCNPJ', () => {
  it('should format CNPJ correctly', () => {
    expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90');
  });

  it('should handle partial input', () => {
    expect(formatCNPJ('12345')).toBe('12.345');
    expect(formatCNPJ('12345678')).toBe('12.345.678');
  });

  it('should limit to 18 characters (formatted)', () => {
    expect(formatCNPJ('123456780001901234')).toBe('12.345.678/0001-90');
  });
});

describe('formatTelefone', () => {
  it('should format telefone with 11 digits', () => {
    expect(formatTelefone('11987654321')).toBe('(11) 98765-4321');
  });

  it('should format telefone with 10 digits', () => {
    expect(formatTelefone('1134567890')).toBe('(11) 3456-7890');
  });

  it('should handle partial input', () => {
    expect(formatTelefone('11')).toBe('(11');
    expect(formatTelefone('119')).toBe('(11) 9');
  });

  it('should remove non-numeric characters', () => {
    expect(formatTelefone('(11) 98765-4321')).toBe('(11) 98765-4321');
  });
});

describe('formatCEP', () => {
  it('should format CEP correctly', () => {
    expect(formatCEP('12345678')).toBe('12345-678');
    expect(formatCEP('12345-678')).toBe('12345-678');
  });

  it('should handle partial input', () => {
    expect(formatCEP('123')).toBe('123');
    expect(formatCEP('12345')).toBe('12345');
  });

  it('should limit to 9 characters (formatted)', () => {
    expect(formatCEP('123456789012')).toBe('12345-678');
  });
});
