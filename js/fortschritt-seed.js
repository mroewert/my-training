// Migrations-Seed-Hook für den Fortschritt-Tab.
// BEWUSST LEER (null): persönliche Körperdaten gehören NICHT in dieses öffentliche Repo.
// Die echte Historie wird privat in den Browser geladen (nur localStorage), siehe
// shared/_tools/fortschritt_import_snippet.txt (erzeugt von shared/_tools/fortschritt_export.py).
// Wenn hier doch mal ein Objekt {ziele, messungen} steht, wird es beim ersten Öffnen
// des Tabs in localStorage übernommen (nur solange dort noch nichts steht).
var FORTSCHRITT_SEED = null;
