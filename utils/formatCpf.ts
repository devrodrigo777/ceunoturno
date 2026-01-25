export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return digits.replace(/(\d{3})(\d+)/, '$1.$2');
  }

  if (digits.length <= 9) {
    return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
  }

  return digits.replace(
    /(\d{3})(\d{3})(\d{3})(\d{1,2})/,
    '$1.$2.$3-$4'
  );
}

export function unformatCPF(value: string): string {
    const digits = value.replace(/\D/g, '');

  return (isValidCPF(digits)) ? digits : "";
}

export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  // Deve ter 11 dígitos
  if (digits.length !== 11) return false;

  // Elimina CPFs inválidos conhecidos (111.111.111-11, etc)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcCheckDigit = (base: string, factor: number) => {
    let total = 0;

    for (let i = 0; i < base.length; i++) {
      total += Number(base[i]) * (factor - i);
    }

    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcCheckDigit(digits.slice(0, 9), 10);
  const digit2 = calcCheckDigit(digits.slice(0, 10), 11);

  return (
    digit1 === Number(digits[9]) &&
    digit2 === Number(digits[10])
  );
}