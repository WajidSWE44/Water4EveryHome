<?php
// backend/app/Helpers/Validator.php

class Validator {
    private array $data;
    private array $errors = [];

    public function __construct(array $data) {
        $this->data = $data;
    }

    public static function make(array $data, array $rules): self {
        $validator = new self($data);
        $validator->validate($rules);
        return $validator;
    }

    public function validate(array $rules): void {
        foreach ($rules as $field => $ruleString) {
            $ruleList = explode('|', $ruleString);
            $value = $this->data[$field] ?? null;

            foreach ($ruleList as $rule) {
                if ($rule === 'required') {
                    if ($value === null || (is_string($value) && trim($value) === '') || (is_array($value) && empty($value))) {
                        $this->errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
                    }
                } elseif ($rule === 'email') {
                    if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $this->errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be a valid email address.';
                    }
                } elseif ($rule === 'numeric') {
                    if ($value !== null && !is_numeric($value)) {
                        $this->errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be numeric.';
                    }
                } elseif (str_starts_with($rule, 'min:')) {
                    $min = (int)substr($rule, 4);
                    if (is_string($value) && strlen($value) < $min) {
                        $this->errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . " must be at least {$min} characters.";
                    } elseif (is_numeric($value) && $value < $min) {
                        $this->errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . " must be at least {$min}.";
                    }
                } elseif (str_starts_with($rule, 'in:')) {
                    $allowed = explode(',', substr($rule, 3));
                    if ($value !== null && !in_array((string)$value, $allowed, true)) {
                        $this->errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' contains an invalid selection.';
                    }
                }
            }
        }
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }

    public function firstError(): string {
        foreach ($this->errors as $fieldErrors) {
            if (!empty($fieldErrors)) {
                return $fieldErrors[0];
            }
        }
        return 'Validation failed.';
    }
}
