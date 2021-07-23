<?php
$audio_path = 'test';
$filenames = scandir($audio_path);
$filenames = array_values(array_diff($filenames, array('.', '..')));
$songs = array();
for ($i = 0; $i < count($filenames); $i++) {
  $fn = $filenames[$i];
  $songs[] = array(
    'path' => $audio_path . '/' . $fn,
    'displayName' => substr($fn, 0, strrpos($fn, '.')),
    'id' => $i,
  );
}
echo json_encode($songs);
?>