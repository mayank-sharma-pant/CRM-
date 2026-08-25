from app.services.sales.whatsapp import destination_msisdn, params_for_record


def test_ten_digit_indian_number_gets_country_code():
    assert destination_msisdn("98765 43210") == "919876543210"


def test_already_prefixed_stays():
    assert destination_msisdn("919876543210") == "919876543210"


def test_blank_phone_raises():
    try:
        destination_msisdn("  ")
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "phone" in str(exc).lower()


class _Lead:
    name = "Ravi"
    company = "Acme"


def test_params_follow_variable_keys():
    assert params_for_record(["name", "company"], _Lead()) == ["Ravi", "Acme"]
