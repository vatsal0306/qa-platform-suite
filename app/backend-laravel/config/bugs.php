<?php

/*
 | Seeded-bug switchboard for the QA practice app.
 |  SEEDED_BUGS=true          -> every bug in docs/seeded-bugs.md is active
 |  SEEDED_BUGS=false         -> app behaves correctly (the "fixed" build)
 |  FIXED_BUGS=BUG-003,BUG-004 -> turn off individual bugs to demonstrate a retest
 */
return [
    'enabled' => filter_var(env('SEEDED_BUGS', true), FILTER_VALIDATE_BOOLEAN),
    'fixed' => array_filter(array_map('trim', explode(',', env('FIXED_BUGS', '')))),
    'export_key' => env('QA_EXPORT_KEY', 'qa-export-key'),
];
