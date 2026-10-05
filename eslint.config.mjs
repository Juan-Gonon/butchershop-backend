import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    rules: {
      // Reglas de formato básico tipo ts-standard
      quotes: ['error', 'single'], // Fuerza comillas simples ' '
      semi: ['error', 'always'], // Exige punto y coma al final
      indent: ['error', 2], // Sangría/Indentación de 2 espacios
      'no-multiple-empty-lines': ['error', { max: 1 }], // Máximo 1 línea en blanco consecutiva
      'comma-dangle': ['error', 'never'] // Sin comas finales en arreglos/objetos
    }
  },
  {
    // Ignorar archivos compilados y dependencias
    ignores: ['dist/', 'node_modules/']
  }
);
