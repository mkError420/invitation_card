<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Attendee.php';
require_once __DIR__ . '/../models/EventConfig.php';

echo "Running backend test suite...\n";

// 1. Test database connection
$db = Database::getConnection();
assert($db instanceof PDO, "DB connection failed");
echo "✓ Database connected successfully\n";

// 2. Test AttendeeModel getAll
$attendeeModel = new AttendeeModel();
$list = $attendeeModel->getAll();
assert(count($list) >= 4, "Initial seed attendees count should be >= 4");
echo "✓ AttendeeModel::getAll returned " . count($list) . " attendees\n";

// 3. Test AttendeeModel create
$newAttendee = [
    'regNo' => '৯৯৯৯',
    'name' => 'পরীক্ষামূলক ব্যবহারকারী',
    'school' => 'পরীক্ষা স্কুল',
    'district' => 'রংপুর',
    'guests' => '১',
    'phone' => '০১৭০০০১১১২২',
    'photoUrl' => '',
];
$created = $attendeeModel->create($newAttendee);
assert(!empty($created['id']), "Created attendee must have an id");
assert($created['name'] === 'পরীক্ষামূলক ব্যবহারকারী', "Created attendee name matches");
echo "✓ AttendeeModel::create created attendee ID: {$created['id']}\n";

// 4. Test AttendeeModel update
$updated = $attendeeModel->update($created['id'], ['name' => 'আপডেটেড ব্যবহারকারী', 'guests' => '৪']);
assert($updated['name'] === 'আপডেটেড ব্যবহারকারী', "Updated name matches");
assert($updated['guests'] === '৪', "Updated guests matches");
echo "✓ AttendeeModel::update updated attendee successfully\n";

// 5. Test AttendeeModel search
$searchResult = $attendeeModel->getAll('আপডেটেড');
assert(count($searchResult) === 1, "Search should return 1 match");
echo "✓ AttendeeModel::getAll search works\n";

// 6. Test AttendeeModel delete
$deleted = $attendeeModel->delete($created['id']);
assert($deleted === true, "Delete should return true");
$checkDeleted = $attendeeModel->getById($created['id']);
assert($checkDeleted === null, "Deleted attendee should no longer exist");
echo "✓ AttendeeModel::delete deleted attendee successfully\n";

// 7. Test EventConfigModel
$configModel = new EventConfigModel();
$config = $configModel->get();
assert(!empty($config['mainTitle']), "Event config mainTitle should not be empty");
echo "✓ EventConfigModel::get retrieved: {$config['mainTitle']}\n";

$updatedConfig = $configModel->update(['venue' => 'রংপুর জিলা পরিষদ মিলনায়তন']);
assert($updatedConfig['venue'] === 'রংপুর জিলা পরিষদ মিলনায়তন', "Config venue update failed");
echo "✓ EventConfigModel::update venue updated successfully\n";

// Revert venue back to default
$configModel->update(['venue' => 'আনান সিটি পার্ক, রংপুর']);
echo "✓ Reverted venue back to default\n";

echo "\nAll backend tests passed successfully! 🚀\n";

